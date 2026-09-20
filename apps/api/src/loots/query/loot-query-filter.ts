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
import { alias, QueryBuilder } from "drizzle-orm/pg-core";
import {
  itemSnapshotTable,
  lootItemTable,
  lootNpcTable,
  lootPlayerTable,
  lootTable,
  npcSnapshotTable,
  playerSnapshotTable,
} from "#src/database/drizzle/schema";
import { buildLootNpcVisibilityCondition } from "#src/loots/loot-visibility";

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

const existsPlayer = (condition: SQL) =>
  exists(
    query
      .select({ id: queryPlayer.id })
      .from(queryPlayer)
      .innerJoin(
        queryPlayerSnapshot,
        eq(queryPlayerSnapshot.id, queryPlayer.playerSnapshotId),
      )
      .where(and(eq(queryPlayer.lootId, lootTable.id), condition)),
  );

const existsNpc = (condition: SQL) =>
  exists(
    query
      .select({ id: queryNpc.id })
      .from(queryNpc)
      .innerJoin(
        queryNpcSnapshot,
        eq(queryNpcSnapshot.id, queryNpc.npcSnapshotId),
      )
      .where(and(eq(queryNpc.lootId, lootTable.id), condition)),
  );

const existsItem = (condition: SQL) =>
  exists(
    query
      .select({ id: queryItem.id })
      .from(queryItem)
      .innerJoin(
        queryItemSnapshot,
        eq(queryItemSnapshot.id, queryItem.itemSnapshotId),
      )
      .where(and(eq(queryItem.lootId, lootTable.id), condition)),
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
    npc ? existsNpc(npc) : undefined,
    item ? existsItem(item) : undefined,
    player ? existsPlayer(player) : undefined,
  ];
};

const existsItemSnapshotIds = (snapshotIds: ReadonlyArray<number>) =>
  exists(
    query
      .select({ id: queryItem.id })
      .from(queryItem)
      .where(
        and(
          eq(queryItem.lootId, lootTable.id),
          inArray(queryItem.itemSnapshotId, [...snapshotIds]),
        ),
      ),
  );

const existsNpcSnapshotIds = (snapshotIds: ReadonlyArray<number>) =>
  exists(
    query
      .select({ id: queryNpc.id })
      .from(queryNpc)
      .where(
        and(
          eq(queryNpc.lootId, lootTable.id),
          inArray(queryNpc.npcSnapshotId, [...snapshotIds]),
        ),
      ),
  );

const existsPlayerSnapshotIds = (snapshotIds: ReadonlyArray<number>) =>
  exists(
    query
      .select({ id: queryPlayer.id })
      .from(queryPlayer)
      .where(
        and(
          eq(queryPlayer.lootId, lootTable.id),
          inArray(queryPlayer.playerSnapshotId, [...snapshotIds]),
        ),
      ),
  );

const npcNameCondition = (snapshotIds: ReadonlyArray<number> | undefined) => {
  if (snapshotIds === undefined) return undefined;

  if (snapshotIds.length === 0) return sql`false`;

  return existsNpcSnapshotIds(snapshotIds);
};

const relationConditions = (
  filters: ResolvedLootQueryFilters,
): Array<SQL | undefined> => [
  filters.players?.length
    ? existsPlayer(inArray(queryPlayerSnapshot.name, [...filters.players]))
    : undefined,
  npcNameCondition(filters.npcNameSnapshotIds),
  filters.npcTypes?.length
    ? existsNpc(inArray(sql`${queryNpcSnapshot.type}`, [...filters.npcTypes]))
    : undefined,
  filters.rarities?.length
    ? existsItem(
        inArray(sql`${queryItemSnapshot.rarity}`, [...filters.rarities]),
      )
    : undefined,
  filters.hid ? existsItem(eq(queryItem.hid, filters.hid)) : undefined,
  filters.itemSnapshotIds
    ? existsItemSnapshotIds(filters.itemSnapshotIds)
    : undefined,
];

const professionCondition = (
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

  return condition ? existsItem(condition) : undefined;
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

const searchCondition = (search: ResolvedLootSearch | undefined) => {
  if (!search) return undefined;
  const pattern = `%${search.pattern}%`;

  return (
    or(
      searchRelationArm(
        search.itemSnapshotIds,
        existsItemSnapshotIds,
        existsItem(ilike(queryItemSnapshot.name, pattern)),
      ),
      searchRelationArm(
        search.npcSnapshotIds,
        existsNpcSnapshotIds,
        existsNpc(ilike(queryNpcSnapshot.name, pattern)),
      ),
      searchRelationArm(
        search.playerSnapshotIds,
        existsPlayerSnapshotIds,
        existsPlayer(ilike(queryPlayerSnapshot.name, pattern)),
      ),
    ) ?? sql`false`
  );
};

export const buildLootQueryConditions = (
  filters: ResolvedLootQueryFilters,
  permissions: ReadonlyArray<string>,
  roles: ReadonlyArray<LootQueryVisibilityRole>,
) => [
  filters.world ? eq(lootTable.world, filters.world) : undefined,
  filters.cursor ? lt(lootTable.id, filters.cursor) : undefined,
  filters.lootId !== undefined ? eq(lootTable.id, filters.lootId) : undefined,
  filters.createdAtMin
    ? gte(lootTable.createdAt, new Date(filters.createdAtMin))
    : undefined,
  filters.createdAtMax
    ? lte(lootTable.createdAt, new Date(filters.createdAtMax))
    : undefined,
  ...rangeConditions(filters),
  ...relationConditions(filters),
  professionCondition(filters.professions),
  searchCondition(filters.search),
  buildLootNpcVisibilityCondition(lootTable.id, permissions, roles),
];
