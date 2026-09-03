import { and, eq, gte, ilike, lt, lte, or, sql, type SQL } from "drizzle-orm";
import { lootTable } from "#src/database/drizzle/schema";

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

const existsPlayer = (condition: SQL) => sql`EXISTS (
  SELECT 1 FROM "LootPlayer" query_lp
  INNER JOIN "PlayerSnapshot" query_ps ON query_ps.id = query_lp."playerSnapshotId"
  WHERE query_lp."lootId" = ${lootTable.id} AND ${condition}
)`;
const existsNpc = (condition: SQL) => sql`EXISTS (
  SELECT 1 FROM "LootNpc" query_ln
  INNER JOIN "NpcSnapshot" query_ns ON query_ns.id = query_ln."npcSnapshotId"
  WHERE query_ln."lootId" = ${lootTable.id} AND ${condition}
)`;
const existsItem = (condition: SQL) => sql`EXISTS (
  SELECT 1 FROM "LootItem" query_li
  INNER JOIN "ItemSnapshot" query_is ON query_is.id = query_li."itemSnapshotId"
  WHERE query_li."lootId" = ${lootTable.id} AND ${condition}
)`;
const sqlList = (values: ReadonlyArray<unknown>) =>
  sql.join(
    values.map((value) => sql`${value}`),
    sql`, `,
  );
const levelRange = (
  column: SQL,
  minimum: number | undefined,
  maximum: number | undefined,
) =>
  minimum === undefined && maximum === undefined
    ? undefined
    : and(
        minimum === undefined ? undefined : sql`${column} >= ${minimum}`,
        maximum === undefined ? undefined : sql`${column} <= ${maximum}`,
      );

const rangeConditions = (filters: LootQueryFilters): Array<SQL | undefined> => {
  const npc = levelRange(
    sql`query_ns.lvl`,
    filters.npcLevelMin,
    filters.npcLevelMax,
  );
  const item = levelRange(
    sql`query_is.lvl`,
    filters.itemLevelMin,
    filters.itemLevelMax,
  );
  const player = levelRange(
    sql`query_lp.lvl`,
    filters.playerLevelMin,
    filters.playerLevelMax,
  );
  return [
    npc ? existsNpc(npc) : undefined,
    item ? existsItem(item) : undefined,
    player ? existsPlayer(player) : undefined,
  ];
};

const relationConditions = (
  filters: LootQueryFilters,
): Array<SQL | undefined> => [
  filters.players?.length
    ? existsPlayer(sql`query_ps.name IN (${sqlList(filters.players)})`)
    : undefined,
  filters.npcs?.length
    ? existsNpc(sql`query_ns.name IN (${sqlList(filters.npcs)})`)
    : undefined,
  filters.npcTypes?.length
    ? existsNpc(sql`query_ns.type IN (${sqlList(filters.npcTypes)})`)
    : undefined,
  filters.rarities?.length
    ? existsItem(sql`query_is.rarity IN (${sqlList(filters.rarities)})`)
    : undefined,
  filters.hid ? existsItem(sql`query_li.hid = ${filters.hid}`) : undefined,
  filters.itemSnapshotIds
    ? existsItem(
        sql`query_li."itemSnapshotId" IN (${sqlList(filters.itemSnapshotIds)})`,
      )
    : undefined,
];

const professionShortname: Record<string, string> = {
  WARRIOR: "w",
  PALADIN: "p",
  HUNTER: "h",
  MAGE: "m",
  BLADE_DANCER: "b",
  TRACKER: "t",
};
const professionCondition = (
  professions: ReadonlyArray<string> | undefined,
) => {
  if (!professions?.length) return undefined;
  const shortnames = professions.flatMap((profession) => {
    const shortname = professionShortname[profession];
    return shortname ? [shortname] : [];
  });
  if (shortnames.length === 0) return undefined;
  const condition = or(
    sql`query_is."statRaw" NOT LIKE '%reqp=%'`,
    ...shortnames.map(
      (shortname) =>
        sql`query_is."statsSnapshot"->>'reqp' LIKE ${`%${shortname}%`}`,
    ),
  );
  return condition ? existsItem(condition) : undefined;
};
const searchCondition = (search: string | undefined) => {
  const value = search?.trim();
  if (!value) return undefined;
  const pattern = `%${value}%`;
  return or(
    ilike(lootTable.location, pattern),
    existsItem(sql`query_is.name ILIKE ${pattern}`),
    existsNpc(sql`query_ns.name ILIKE ${pattern}`),
    existsPlayer(sql`query_ps.name ILIKE ${pattern}`),
  );
};

const visibilityCondition = (
  permissions: ReadonlyArray<string>,
  roles: ReadonlyArray<LootQueryVisibilityRole>,
) => {
  if (permissions.includes("OWNER")) return undefined;
  const readableRoles = roles.filter((role) =>
    role.permissions.includes("LOOTLOG_LOOTS_READ"),
  );
  if (readableRoles.length === 0) return sql`false`;
  const roleConditions = readableRoles.map((role) => {
    const excluded: string[] = [];
    if (!role.permissions.includes("LOOTLOG_LOOTS_TITANS_READ")) {
      excluded.push("TITAN");
    }
    if (!role.permissions.includes("LOOTLOG_LOOTS_HEROES_READ")) {
      excluded.push("HERO", "EVENT_HERO");
    }
    const typeCondition =
      excluded.length === 0
        ? sql`visibility_npc.type IS NOT NULL`
        : sql`visibility_npc.type IS NOT NULL AND visibility_npc.type NOT IN (${sqlList(excluded)})`;
    return sql`(
      visibility_npc.lvl IS NOT NULL
      AND visibility_npc.lvl BETWEEN ${role.lvlRangeFrom ?? 0} AND ${role.lvlRangeTo ?? 500}
      AND ${typeCondition}
    )`;
  });
  return sql`
    EXISTS (SELECT 1 FROM "LootNpc" visibility_ln WHERE visibility_ln."lootId" = ${lootTable.id})
    AND NOT EXISTS (
      SELECT 1 FROM "LootNpc" visibility_ln
      INNER JOIN "NpcSnapshot" visibility_npc ON visibility_npc.id = visibility_ln."npcSnapshotId"
      WHERE visibility_ln."lootId" = ${lootTable.id}
        AND NOT (${sql.join(roleConditions, sql` OR `)})
    )`;
};

export const buildLootQueryConditions = (
  filters: LootQueryFilters,
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
  visibilityCondition(permissions, roles),
];
