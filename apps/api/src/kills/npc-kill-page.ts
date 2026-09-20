import {
  and,
  asc,
  count,
  desc,
  eq,
  max,
  min,
  sql,
  sum,
  type SQL,
} from "drizzle-orm";
import { alias, QueryBuilder } from "drizzle-orm/pg-core";
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
  const query = new QueryBuilder();
  const kills = "memberKills" in table ? table.memberKills : table.totalKills;
  const direction = options.sortOrder === "asc" ? asc : desc;
  const metadata = alias(table, "metadata");
  const first = alias(table, "first_source");

  // PostgreSQL materializes this multiply referenced CTE, keeping the page and
  // its unpaginated overview on the same filtered rows in one MVCC snapshot.
  const filtered = query.$with("filtered").as(
    query
      .select({
        id: table.id,
        npcId: table.npcId,
        npcType: table.npcType,
        npcLvl: table.npcLvl,
        kills,
      })
      .from(table)
      .where(condition),
  );

  const totals = query.$with("totals").as(
    query
      .select({
        npcId: filtered.npcId,
        totalKills: sql<number>`${sum(filtered.kills)}::float8`.as(
          "totalKills",
        ),
        npcLvl: max(filtered.npcLvl).as("npcLvl"),
        firstId: min(filtered.id).as("first_id"),
      })
      .from(filtered)
      .groupBy(filtered.npcId),
  );

  const page = query.$with("page").as(
    query
      .select()
      .from(totals)
      .orderBy(
        direction(
          options.sortBy === "level" ? totals.npcLvl : totals.totalKills,
        ),
        totals.npcId,
      )
      .limit(options.limit)
      .offset(options.cursor),
  );

  // Rank before fetching snapshots so only the requested page needs PK lookups.
  // Highest-level metadata wins, then source ID; type comes from the lowest ID.
  const metadataIds = query.$with("metadata_ids").as(
    query
      .select({ npcId: filtered.npcId, id: min(filtered.id).as("id") })
      .from(filtered)
      .innerJoin(
        page,
        and(eq(page.npcId, filtered.npcId), eq(page.npcLvl, filtered.npcLvl)),
      )
      .groupBy(filtered.npcId),
  );

  const ranked = query.$with("ranked").as(
    query
      .select({
        npcId: page.npcId,
        npcName: metadata.npcName,
        npcType: first.npcType,
        npcLvl: page.npcLvl,
        npcProf: metadata.npcProf,
        npcIcon: metadata.npcIcon,
        totalKills: page.totalKills,
      })
      .from(page)
      .innerJoin(metadataIds, eq(metadataIds.npcId, page.npcId))
      .innerJoin(metadata, eq(metadata.id, metadataIds.id))
      .innerJoin(first, eq(first.id, page.firstId)),
  );

  const npcs = query
    .select({
      value: sql`coalesce(json_agg(${ranked} order by ${direction(options.sortBy === "level" ? ranked.npcLvl : ranked.totalKills)}, ${ranked.npcId}), '[]'::json)`,
    })
    .from(ranked);

  const types = query
    .select({
      npcType: filtered.npcType,
      kills: sql<number>`${sum(filtered.kills)}::float8`.as("kills"),
    })
    .from(filtered)
    .groupBy(filtered.npcType)
    .as("types");

  const participationsByType = query
    .select({
      value: sql`coalesce(json_object_agg(${types.npcType}, ${types.kills}), '{}'::json)`,
    })
    .from(types);

  return query
    .with(filtered, totals, page, metadataIds, ranked)
    .select({
      payload: sql`json_build_object(
      'npcs', (${npcs}),
      'total', ${count()},
      'totalParticipations', ${options.includeOverview ? sql`coalesce(${sum(totals.totalKills)}, 0)` : sql`0`},
      'participationsByType', ${options.includeOverview ? sql`(${participationsByType})` : sql`'{}'::json`}
    )`.as("payload"),
    })
    .from(totals)
    .getSQL();
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
