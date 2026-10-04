import { asc, count, desc, eq, max, sql, sum, type SQL } from "drizzle-orm";
import { QueryBuilder } from "drizzle-orm/pg-core";
import { Effect, Schema } from "effect";
import type { ApiDatabase } from "#src/database/drizzle/database";
import { UserNpcKillsResponse } from "#src/contracts/kills/schemas";
import type { MemberKillSource, UserKillSource } from "./kill-source.js";

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
  source: UserKillSource | MemberKillSource,
  condition: SQL | undefined,
  options: PageOptions,
) => {
  const query = new QueryBuilder();
  const direction = options.sortOrder === "asc" ? asc : desc;

  // PostgreSQL materializes this multiply referenced CTE, keeping the page and
  // its unpaginated overview on the same filtered rows in one MVCC snapshot.
  const filtered = query.$with("filtered").as(
    query
      .select({
        npcId: source.npcId,
        npcName: source.npcName,
        npcType: source.npcType,
        npcLvl: source.npcLvl,
        npcProf: source.npcProf,
        npcIcon: source.npcIcon,
        kills: source.kills,
        lastKilledAt: source.lastKilledAt,
      })
      .from(source)
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

  // Rank before reading descriptions so only the requested page is sorted.
  // The latest row at the highest level describes the NPC.
  const metadata = query.$with("metadata").as(
    query
      .selectDistinctOn([filtered.npcId], {
        npcId: filtered.npcId,
        npcName: filtered.npcName,
        npcType: filtered.npcType,
        npcProf: filtered.npcProf,
        npcIcon: filtered.npcIcon,
      })
      .from(filtered)
      .innerJoin(page, eq(page.npcId, filtered.npcId))
      .orderBy(
        filtered.npcId,
        desc(filtered.npcLvl),
        desc(filtered.lastKilledAt),
      ),
  );

  const ranked = query.$with("ranked").as(
    query
      .select({
        npcId: page.npcId,
        npcName: metadata.npcName,
        npcType: metadata.npcType,
        npcLvl: page.npcLvl,
        npcProf: metadata.npcProf,
        npcIcon: metadata.npcIcon,
        totalKills: page.totalKills,
      })
      .from(page)
      .innerJoin(metadata, eq(metadata.npcId, page.npcId)),
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
    .with(filtered, totals, page, metadata, ranked)
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
  source: UserKillSource | MemberKillSource,
  condition: SQL | undefined,
  options: PageOptions,
) {
  const result = yield* database.execute(
    buildNpcKillPageSql(source, condition, options),
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
