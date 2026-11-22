import { getShortnameByProf } from "@lootlog/domain/profession";
import type { ItemRarityEnum as ItemRarity } from "@lootlog/schema/item-rarity";
import type { NpcTypeEnum as NpcType } from "@lootlog/schema/npc-type";
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
import {
  lootNpcTypeCondition,
  lootRarityCondition,
} from "#src/loots/loot-record-facts";
import { buildLootNpcVisibilityCondition } from "#src/loots/loot-visibility";
import { containsPattern } from "#src/shared/sql-like";

export type LootQueryFilters = {
  readonly npcTypes?: ReadonlyArray<NpcType>;
  readonly npcs?: ReadonlyArray<string>;
  readonly players?: ReadonlyArray<string>;
  readonly rarities?: ReadonlyArray<ItemRarity>;
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

export const LOOT_SEARCH_SNAPSHOT_LIMIT = 1000;

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

const lootIdIn = (lootId: PgColumn, lootIds: SQLWrapper) =>
  sql`${lootId} = any(array(${lootIds}))`;

const npcNameCondition = (
  lootId: PgColumn,
  snapshotIds: ReadonlyArray<number> | undefined,
) => {
  if (snapshotIds === undefined) return undefined;

  if (snapshotIds.length === 0) return sql`false`;

  return lootIdIn(
    lootId,
    query
      .select({ lootId: queryNpc.lootId })
      .from(queryNpc)
      .where(inArray(queryNpc.npcSnapshotId, [...snapshotIds])),
  );
};

const itemSnapshotCondition = (
  lootId: PgColumn,
  snapshotIds: ReadonlyArray<number> | undefined,
) =>
  snapshotIds === undefined
    ? undefined
    : lootIdIn(
        lootId,
        query
          .select({ lootId: queryItem.lootId })
          .from(queryItem)
          .where(inArray(queryItem.itemSnapshotId, [...snapshotIds])),
      );

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
    ? lootNpcTypeCondition(
        organizationLootRecordTable.npcTypeMask,
        filters.npcTypes,
      )
    : undefined,
  filters.rarities?.length
    ? lootRarityCondition(
        organizationLootRecordTable.lootRarityMask,
        filters.rarities,
      )
    : undefined,
  filters.hid
    ? existsItem(source.lootId, eq(queryItem.hid, filters.hid))
    : undefined,
  itemSnapshotCondition(source.lootId, filters.itemSnapshotIds),
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

export const lootQuerySource: LootQuerySource = {
  lootId: lootTable.id,
  world: lootTable.world,
  createdAt: lootTable.createdAt,
};

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
  buildLootNpcVisibilityCondition(
    organizationLootRecordTable.npcVisibility,
    permissions,
    roles,
  ),
];
