import { getShortnameByProf } from "@lootlog/domain/profession";
import {
  and,
  eq,
  exists,
  gte,
  ilike,
  inArray,
  like,
  lt,
  lte,
  notLike,
  or,
  sql,
  type SQL,
  type SQLWrapper,
} from "drizzle-orm";
import { alias, QueryBuilder, type PgColumn } from "drizzle-orm/pg-core";
import {
  itemSnapshotTable,
  lootItemTable,
  lootNpcTable,
  lootPlayerTable,
  lootTable,
  npcSnapshotTable,
  organizationLootRecordTable,
  playerSnapshotTable,
} from "#src/database/drizzle/loot.schema";
import { buildLootNpcVisibilityCondition } from "#src/loots/loot-visibility";
import { containsPattern } from "#src/shared/sql-like";

export type LootQueryFilters = {
  readonly npcTypes?: ReadonlyArray<string>;
  readonly npcs?: ReadonlyArray<string>;
  readonly players?: ReadonlyArray<string>;
  readonly rarities?: ReadonlyArray<string>;
  readonly professions?: ReadonlyArray<string>;
  readonly npcLevelMin?: number;
  readonly npcLevelMax?: number;
  readonly itemLevelMin?: number;
  readonly itemLevelMax?: number;
  readonly playerLevelMin?: number;
  readonly playerLevelMax?: number;
  readonly search?: string;
  readonly world?: string;
  readonly hid?: string;
  readonly itemSnapshotIds?: ReadonlyArray<number>;
  readonly cursor?: number | null;
  readonly createdAtMin?: string;
  readonly createdAtMax?: string;
  readonly lootId?: number;
};

/**
 * Where the scalar columns a page filters on live. Both the loot and the
 * organization's record of it carry the loot id, the world and the creation
 * time, so a query can be driven from whichever table it already scans: the id
 * selection drives from the record and never joins Loot, while queries that
 * read other loot columns keep driving from Loot.
 */
export type LootQuerySource = {
  readonly lootId: PgColumn;
  readonly world: PgColumn;
  readonly createdAt: PgColumn;
};

export type LootQueryVisibilityRole = {
  readonly lvlRangeFrom: number | null;
  readonly lvlRangeTo: number | null;
  readonly permissions: ReadonlyArray<string>;
};

/**
 * A free-text term resolved against the snapshot tables before the page query
 * runs. The term matches item, NPC and player names; map names are not
 * searchable.
 *
 * An empty array means the term cannot match that relation, so its arm is
 * dropped. `null` means the term matched more snapshots than
 * {@link LOOT_SEARCH_SNAPSHOT_LIMIT} enumerates, so that arm keeps the original
 * pattern; such a term matches densely enough for the descending scan to stop
 * early.
 */
export type ResolvedLootSearch = {
  readonly pattern: string;
  readonly itemSnapshotIds: ReadonlyArray<number> | null;
  readonly npcSnapshotIds: ReadonlyArray<number> | null;
  readonly playerSnapshotIds: ReadonlyArray<number> | null;
};

export type ResolvedLootQueryFilters = Omit<
  LootQueryFilters,
  "npcs" | "search"
> & {
  readonly npcNameSnapshotIds?: ReadonlyArray<number>;
  readonly search?: ResolvedLootSearch;
};

/** Snapshot ids enumerated per relation before a term falls back to its pattern. */
export const LOOT_SEARCH_SNAPSHOT_LIMIT = 1000;

/** A resolved term that can match nothing anywhere: the page query is skipped. */
export const lootSearchMatchesNothing = (search: ResolvedLootSearch) =>
  search.itemSnapshotIds?.length === 0 &&
  search.npcSnapshotIds?.length === 0 &&
  search.playerSnapshotIds?.length === 0;

const query = new QueryBuilder();

const queryPlayer = alias(lootPlayerTable, "query_lp");

const queryPlayerSnapshot = alias(playerSnapshotTable, "query_ps");

const queryNpc = alias(lootNpcTable, "query_ln");

const queryNpcSnapshot = alias(npcSnapshotTable, "query_ns");

const queryItem = alias(lootItemTable, "query_li");

const queryItemSnapshot = alias(itemSnapshotTable, "query_is");

const existsPlayer = (lootId: PgColumn, condition: SQL) =>
  exists(
    query
      .select({ id: queryPlayer.id })
      .from(queryPlayer)
      .innerJoin(
        queryPlayerSnapshot,
        eq(queryPlayerSnapshot.id, queryPlayer.playerSnapshotId),
      )
      .where(and(eq(queryPlayer.lootId, lootId), condition)),
  );

const existsNpc = (lootId: PgColumn, condition: SQL) =>
  exists(
    query
      .select({ id: queryNpc.id })
      .from(queryNpc)
      .innerJoin(
        queryNpcSnapshot,
        eq(queryNpcSnapshot.id, queryNpc.npcSnapshotId),
      )
      .where(and(eq(queryNpc.lootId, lootId), condition)),
  );

const existsItem = (lootId: PgColumn, condition: SQL) =>
  exists(
    query
      .select({ id: queryItem.id })
      .from(queryItem)
      .innerJoin(
        queryItemSnapshot,
        eq(queryItemSnapshot.id, queryItem.itemSnapshotId),
      )
      .where(and(eq(queryItem.lootId, lootId), condition)),
  );

const levelRange = (
  column: SQLWrapper,
  minimum: number | undefined,
  maximum: number | undefined,
) =>
  minimum === undefined && maximum === undefined
    ? undefined
    : and(
        minimum === undefined ? undefined : gte(column, minimum),
        maximum === undefined ? undefined : lte(column, maximum),
      );

const rangeConditions = (
  source: LootQuerySource,
  filters: ResolvedLootQueryFilters,
): Array<SQL | undefined> => {
  const npc = levelRange(
    queryNpcSnapshot.lvl,
    filters.npcLevelMin,
    filters.npcLevelMax,
  );

  const item = levelRange(
    queryItemSnapshot.lvl,
    filters.itemLevelMin,
    filters.itemLevelMax,
  );

  const player = levelRange(
    queryPlayer.lvl,
    filters.playerLevelMin,
    filters.playerLevelMax,
  );

  return [
    npc ? existsNpc(source.lootId, npc) : undefined,
    item ? existsItem(source.lootId, item) : undefined,
    player ? existsPlayer(source.lootId, player) : undefined,
  ];
};

const existsItemSnapshotIds = (
  lootId: PgColumn,
  snapshotIds: ReadonlyArray<number>,
) =>
  exists(
    query
      .select({ id: queryItem.id })
      .from(queryItem)
      .where(
        and(
          eq(queryItem.lootId, lootId),
          inArray(queryItem.itemSnapshotId, [...snapshotIds]),
        ),
      ),
  );

const existsNpcSnapshotIds = (
  lootId: PgColumn,
  snapshotIds: ReadonlyArray<number>,
) =>
  exists(
    query
      .select({ id: queryNpc.id })
      .from(queryNpc)
      .where(
        and(
          eq(queryNpc.lootId, lootId),
          inArray(queryNpc.npcSnapshotId, [...snapshotIds]),
        ),
      ),
  );

const existsPlayerSnapshotIds = (
  lootId: PgColumn,
  snapshotIds: ReadonlyArray<number>,
) =>
  exists(
    query
      .select({ id: queryPlayer.id })
      .from(queryPlayer)
      .where(
        and(
          eq(queryPlayer.lootId, lootId),
          inArray(queryPlayer.playerSnapshotId, [...snapshotIds]),
        ),
      ),
  );

const npcNameCondition = (
  lootId: PgColumn,
  snapshotIds: ReadonlyArray<number> | undefined,
) => {
  if (snapshotIds === undefined) return undefined;

  if (snapshotIds.length === 0) return sql`false`;

  // Start from the chosen NPCs instead of testing each scanned loot: the
  // correlated EXISTS made a rare NPC on a busy world walk the Organization's
  // whole world history (2.7 s, 1M buffers on a local production copy), while
  // the array reads the NPCs' rows from "LootNpc_npcSnapshotId_lootId_idx"
  // and probes the records by key (12 ms). The query builder has no
  // `= ANY(ARRAY(subquery))`; the `IN` semi-join `inArray` renders read 4x
  // the buffers.
  const npcLootIds = query
    .select({ lootId: queryNpc.lootId })
    .from(queryNpc)
    .where(inArray(queryNpc.npcSnapshotId, [...snapshotIds]));

  return sql`${lootId} = any(array(${npcLootIds}))`;
};

const relationConditions = (
  source: LootQuerySource,
  filters: ResolvedLootQueryFilters,
): Array<SQL | undefined> => [
  filters.players?.length
    ? existsPlayer(
        source.lootId,
        inArray(queryPlayerSnapshot.name, [...filters.players]),
      )
    : undefined,
  npcNameCondition(source.lootId, filters.npcNameSnapshotIds),
  filters.npcTypes?.length
    ? existsNpc(
        source.lootId,
        inArray(sql`${queryNpcSnapshot.type}`, [...filters.npcTypes]),
      )
    : undefined,
  filters.rarities?.length
    ? existsItem(
        source.lootId,
        inArray(sql`${queryItemSnapshot.rarity}`, [...filters.rarities]),
      )
    : undefined,
  filters.hid
    ? existsItem(source.lootId, eq(queryItem.hid, filters.hid))
    : undefined,
  filters.itemSnapshotIds
    ? existsItemSnapshotIds(source.lootId, filters.itemSnapshotIds)
    : undefined,
];

const professionCondition = (
  lootId: PgColumn,
  professions: ReadonlyArray<string> | undefined,
) => {
  if (!professions?.length) return undefined;

  const shortnames = professions.flatMap((profession) => {
    const shortname = getShortnameByProf(profession);

    return shortname ? [shortname] : [];
  });

  if (shortnames.length === 0) return undefined;

  const condition = or(
    notLike(queryItemSnapshot.statRaw, "%reqp=%"),
    ...shortnames.map((shortname) =>
      like(sql`${queryItemSnapshot.statsSnapshot}->>'reqp'`, `%${shortname}%`),
    ),
  );

  return condition ? existsItem(lootId, condition) : undefined;
};

// Each relation contributes an arm only when the term can still match it.
// Enumerated snapshot ids replace the correlated name join, which otherwise
// reads a snapshot row and runs ILIKE for every loot the scan examines.
const searchRelationArm = (
  snapshotIds: ReadonlyArray<number> | null,
  membership: (ids: ReadonlyArray<number>) => SQL,
  pattern: SQL,
) => {
  if (snapshotIds === null) return pattern;

  return snapshotIds.length === 0 ? undefined : membership(snapshotIds);
};

const searchCondition = (
  lootId: PgColumn,
  search: ResolvedLootSearch | undefined,
) => {
  if (!search) return undefined;
  const pattern = containsPattern(search.pattern);

  return (
    or(
      searchRelationArm(
        search.itemSnapshotIds,
        (ids) => existsItemSnapshotIds(lootId, ids),
        existsItem(lootId, ilike(queryItemSnapshot.name, pattern)),
      ),
      searchRelationArm(
        search.npcSnapshotIds,
        (ids) => existsNpcSnapshotIds(lootId, ids),
        existsNpc(lootId, ilike(queryNpcSnapshot.name, pattern)),
      ),
      searchRelationArm(
        search.playerSnapshotIds,
        (ids) => existsPlayerSnapshotIds(lootId, ids),
        existsPlayer(lootId, ilike(queryPlayerSnapshot.name, pattern)),
      ),
    ) ?? sql`false`
  );
};

/** The loot's own columns: for queries that already read other loot columns. */
export const lootQuerySource: LootQuerySource = {
  lootId: lootTable.id,
  world: lootTable.world,
  createdAt: lootTable.createdAt,
};

/**
 * The organization's record of the loot. Driving the page from here keeps the
 * scan, the filters and the ordering on one table: testing the world through
 * Loot was 80% of the buffers a page read, because it ran once per record the
 * Organization owns.
 */
export const organizationLootRecordQuerySource: LootQuerySource = {
  lootId: organizationLootRecordTable.lootId,
  world: organizationLootRecordTable.lootWorld,
  createdAt: organizationLootRecordTable.lootCreatedAt,
};

export const buildLootQueryConditions = (
  source: LootQuerySource,
  filters: ResolvedLootQueryFilters,
  permissions: ReadonlyArray<string>,
  roles: ReadonlyArray<LootQueryVisibilityRole>,
) => [
  filters.world ? eq(source.world, filters.world) : undefined,
  filters.cursor ? lt(source.lootId, filters.cursor) : undefined,
  filters.lootId !== undefined ? eq(source.lootId, filters.lootId) : undefined,
  filters.createdAtMin
    ? gte(source.createdAt, new Date(filters.createdAtMin))
    : undefined,
  filters.createdAtMax
    ? lte(source.createdAt, new Date(filters.createdAtMax))
    : undefined,
  ...rangeConditions(source, filters),
  ...relationConditions(source, filters),
  professionCondition(source.lootId, filters.professions),
  searchCondition(source.lootId, filters.search),
  buildLootNpcVisibilityCondition(source.lootId, permissions, roles),
];
