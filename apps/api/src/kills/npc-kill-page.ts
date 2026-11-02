import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  lt,
  max,
  or,
  sql,
  sum,
  type SQL,
} from "drizzle-orm";
import { QueryBuilder } from "drizzle-orm/pg-core";
import { Effect, Schema } from "effect";
import { FiniteNumber } from "@lootlog/schema/http-scalars";
import { stableJsonStringify } from "@lootlog/schema/stable-json";
import type { ApiDatabase } from "#src/database/drizzle/database";
import {
  UserNpcKillsResponse,
  type MemberKillsQuery,
  type UserNpcKillsQuery,
} from "#src/contracts/kills/schemas";
import { InvalidRequestError } from "#src/shared/http/http-errors";
import { decodePageCursor, toPage } from "#src/shared/keyset-page";
import type { MemberKillSource, UserKillSource } from "./kill-source.js";

type SortBy = "kills" | "level";

type SortOrder = "asc" | "desc";

/** The sort key and NPC ID of the last NPC on the previous page. */
export type NpcKillPageAfter = {
  readonly sortValue: number;
  readonly npcId: number;
};

type PageOptions = {
  readonly limit: number;
  readonly after?: NpcKillPageAfter | undefined;
  readonly sortBy?: SortBy | undefined;
  readonly sortOrder?: SortOrder | undefined;
  readonly includeOverview?: boolean;
};

const NpcKillPageCursor = Schema.Struct({
  /** Fingerprint of the filters and sort the cursor was issued for. */
  filters: Schema.String,
  sortValue: FiniteNumber,
  npcId: FiniteNumber,
});

/** The filters and sort of a page request, without its cursor and size. */
export type NpcKillPageFilters =
  | Omit<UserNpcKillsQuery, "cursor" | "limit">
  | Omit<MemberKillsQuery, "cursor" | "limit">;

const filtersFingerprint = (filters: NpcKillPageFilters) =>
  new Bun.CryptoHasher("sha256")
    .update(stableJsonStringify(filters))
    .digest("base64url")
    .slice(0, 22);

/**
 * Reads the keyset position of an NPC kill page cursor, rejecting a cursor
 * issued for other filters or another sort with a 400 `INVALID_CURSOR`.
 */
export const decodeNpcKillPageCursor = (
  cursor: string | undefined,
  filters: NpcKillPageFilters,
): Effect.Effect<NpcKillPageAfter | undefined, InvalidRequestError> =>
  cursor === undefined
    ? Effect.succeed(undefined)
    : decodePageCursor(NpcKillPageCursor, cursor).pipe(
        Effect.flatMap(({ filters: issuedFor, sortValue, npcId }) =>
          issuedFor === filtersFingerprint(filters)
            ? Effect.succeed({ sortValue, npcId })
            : Effect.fail(new InvalidRequestError({ code: "INVALID_CURSOR" })),
        ),
      );

type KilledNpc = (typeof UserNpcKillsResponse.Type.items)[number];

/**
 * Turns a `limit + 1` NPC page into its items and the opaque cursor of the
 * next page.
 */
export const toNpcKillPage = (
  npcs: ReadonlyArray<KilledNpc>,
  limit: number,
  filters: NpcKillPageFilters,
  sortBy: SortBy | undefined,
) => {
  const fingerprint = filtersFingerprint(filters);

  return toPage([...npcs], limit, NpcKillPageCursor, (npc) => ({
    filters: fingerprint,
    sortValue: sortBy === "level" ? npc.npcLvl : npc.totalKills,
    npcId: npc.npcId,
  }));
};

const NpcKillPage = Schema.Struct({
  npcs: UserNpcKillsResponse.fields.items,
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
  const beyond = options.sortOrder === "asc" ? gt : lt;

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

  const sortKey =
    options.sortBy === "level" ? totals.npcLvl : totals.totalKills;

  const { after } = options;

  // Keyset continuation: NPCs after the previous page's last (sort key, NPC ID).
  const page = query.$with("page").as(
    query
      .select()
      .from(totals)
      .where(
        after
          ? or(
              beyond(sortKey, after.sortValue),
              and(eq(sortKey, after.sortValue), gt(totals.npcId, after.npcId)),
            )
          : undefined,
      )
      .orderBy(direction(sortKey), totals.npcId)
      .limit(options.limit),
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
