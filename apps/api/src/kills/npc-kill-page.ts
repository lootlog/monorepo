import { sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { Effect, Schema } from "effect";
import type { ApiDatabase } from "#src/database/drizzle/database";
import type {
  npcKillStatsTable,
  npcKillStatsBucketTable,
  userKillStatsTable,
  userKillStatsBucketTable,
} from "#src/database/drizzle/schema";
import { UserNpcKillsResponse } from "#src/contracts/kills/schemas";

type KillTable =
  | typeof npcKillStatsTable
  | typeof npcKillStatsBucketTable
  | typeof userKillStatsTable
  | typeof userKillStatsBucketTable;

type PageOptions = {
  readonly limit: number;
  readonly cursor: number;
  readonly sortBy?: "kills" | "level";
  readonly sortOrder?: "asc" | "desc";
  readonly includeOverview?: boolean;
};

const NpcKillPage = Schema.Struct({
  npcs: UserNpcKillsResponse.fields.npcs,
  total: Schema.Number,
  totalParticipations: Schema.Number,
  participationsByType: Schema.Record(Schema.String, Schema.Number),
});

export const buildNpcKillPageSql = (
  table: KillTable,
  condition: SQL | undefined,
  options: PageOptions,
) => {
  const kills = "memberKills" in table ? table.memberKills : table.totalKills;
  const sort = options.sortBy === "level" ? sql`"npcLvl"` : sql`"totalKills"`;

  const metadata = alias(table, "metadata");

  const first = alias(table, "first_source");

  const direction = options.sortOrder === "asc" ? sql`asc` : sql`desc`;

  // Filter once for both the page and its unpaginated overview in one MVCC snapshot.
  // Previously unordered rows picked arbitrary ties. Match guild rankings with
  // highest-level metadata, then stable source id; keep the lowest-id source's type.
  // Rank before fetching snapshots so only the requested page needs PK lookups.
  return sql`
    with filtered as materialized (
      select ${table.id} as id, ${table.npcId} as "npcId",
        ${table.npcType} as "npcType", ${table.npcLvl} as "npcLvl", ${kills} as kills
      from ${table} where ${condition ?? sql`true`}
    ), totals as (
      select "npcId", sum(kills)::float8 as "totalKills", max("npcLvl") as "npcLvl", min(id) as first_id
      from filtered group by "npcId"
    ), page as (
      select * from totals order by ${sort} ${direction}, "npcId"
      limit ${options.limit} offset ${options.cursor}
    ), metadata_ids as (
      select f."npcId", min(f.id) as id
      from filtered f join page p on p."npcId" = f."npcId" and p."npcLvl" = f."npcLvl"
      group by f."npcId"
    ), ranked as (
      select p."npcId", ${metadata.npcName} as "npcName", ${first.npcType} as "npcType",
        p."npcLvl", ${metadata.npcProf} as "npcProf", ${metadata.npcIcon} as "npcIcon", p."totalKills"
      from page p join metadata_ids m using ("npcId")
      join ${table} as metadata on ${metadata.id} = m.id
      join ${table} as first_source on ${first.id} = p.first_id
    )
    select json_build_object(
      'npcs', coalesce((select json_agg(r order by ${sort} ${direction}, "npcId") from ranked r), '[]'::json),
      'total', (select count(*) from totals),
      'totalParticipations', ${options.includeOverview ? sql`(select coalesce(sum("totalKills"), 0) from totals)` : sql`0`},
      'participationsByType', ${
        options.includeOverview
          ? sql`coalesce((select json_object_agg("npcType", kills) from (
        select "npcType", sum(kills)::float8 as kills from filtered group by "npcType"
      ) types), '{}'::json)`
          : sql`'{}'::json`
      }
    ) as payload
  `;
};

export const readNpcKillPage = Effect.fn("kills.npc-page")(function* (
  database: typeof ApiDatabase.Service,
  table: KillTable,
  condition: SQL | undefined,
  options: PageOptions,
) {
  const result = yield* database.execute(
    buildNpcKillPageSql(table, condition, options),
  );

  const decoded = yield* Schema.decodeUnknownEffect(
    Schema.Struct({
      rows: Schema.Array(Schema.Struct({ payload: NpcKillPage })),
    }),
  )(result);

  const row = decoded.rows[0];

  if (!row) return yield* Effect.fail(new Error("Missing NPC kill aggregate"));

  return row.payload;
});
