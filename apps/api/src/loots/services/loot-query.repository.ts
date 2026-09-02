import { Injectable } from "@nestjs/common";
import {
  and,
  asc,
  count,
  countDistinct,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  lt,
  lte,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { Effect } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";
import { DrizzleDatabaseRuntime } from "#src/database/drizzle/runtime";
import {
  itemSnapshotTable,
  lootCommentTable,
  lootItemTable,
  lootNpcTable,
  lootPlayerTable,
  lootSubmissionTable,
  lootTable,
  memberTable,
  npcSnapshotTable,
  organizationLootRecordTable,
  playerSnapshotTable,
} from "#src/database/drizzle/schema";

export type LootQueryFilters = {
  npcTypes?: ReadonlyArray<string>;
  npcs?: ReadonlyArray<string>;
  players?: ReadonlyArray<string>;
  rarities?: ReadonlyArray<string>;
  professions?: ReadonlyArray<string>;
  npcLevelMin?: number;
  npcLevelMax?: number;
  itemLevelMin?: number;
  itemLevelMax?: number;
  playerLevelMin?: number;
  playerLevelMax?: number;
  search?: string;
  world?: string;
  hid?: string;
  itemSnapshotIds?: ReadonlyArray<number>;
  cursor?: number | null;
  createdAtMin?: string;
  createdAtMax?: string;
  lootId?: number;
};

type VisibilityRole = {
  lvlRangeFrom: number | null;
  lvlRangeTo: number | null;
  permissions: ReadonlyArray<string>;
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
  const npcRange = levelRange(
    sql`query_ns.lvl`,
    filters.npcLevelMin,
    filters.npcLevelMax,
  );
  const itemRange = levelRange(
    sql`query_is.lvl`,
    filters.itemLevelMin,
    filters.itemLevelMax,
  );
  const playerRange = levelRange(
    sql`query_lp.lvl`,
    filters.playerLevelMin,
    filters.playerLevelMax,
  );
  return [
    npcRange ? existsNpc(npcRange) : undefined,
    itemRange ? existsItem(itemRange) : undefined,
    playerRange ? existsPlayer(playerRange) : undefined,
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

const professionShortname: Record<string, string> = {
  WARRIOR: "w",
  PALADIN: "p",
  HUNTER: "h",
  MAGE: "m",
  BLADE_DANCER: "b",
  TRACKER: "t",
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
  roles: ReadonlyArray<VisibilityRole>,
) => {
  if (permissions.includes("OWNER")) return undefined;
  const readableRoles = roles.filter((role) =>
    role.permissions.includes("LOOTLOG_LOOTS_READ"),
  );
  if (readableRoles.length === 0) return sql`false`;
  const roleConditions = readableRoles.map((role) => {
    const excluded: string[] = [];
    if (!role.permissions.includes("LOOTLOG_LOOTS_TITANS_READ"))
      excluded.push("TITAN");
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

const buildConditions = (
  filters: LootQueryFilters,
  permissions: ReadonlyArray<string>,
  roles: ReadonlyArray<VisibilityRole>,
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

@Injectable()
export class LootQueryRepository {
  constructor(private readonly databaseRuntime: DrizzleDatabaseRuntime) {}

  findItemSnapshotIds(names: ReadonlyArray<string>) {
    if (names.length === 0) return Promise.resolve([]);
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .select({ id: itemSnapshotTable.id })
          .from(itemSnapshotTable)
          .where(inArray(itemSnapshotTable.name, [...names])),
      ),
    );
  }

  async findMany(options: {
    guildId: string;
    permissions: ReadonlyArray<string>;
    roles: ReadonlyArray<VisibilityRole>;
    filters: LootQueryFilters;
    limit: number;
  }) {
    const lootIds = await this.findIds(options);
    return this.hydrate(options.guildId, lootIds);
  }

  count(options: {
    guildId: string;
    permissions: ReadonlyArray<string>;
    roles: ReadonlyArray<VisibilityRole>;
    filters: LootQueryFilters;
  }) {
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .select({ value: countDistinct(lootTable.id) })
          .from(lootTable)
          .innerJoin(
            organizationLootRecordTable,
            and(
              eq(organizationLootRecordTable.lootId, lootTable.id),
              eq(organizationLootRecordTable.guildId, options.guildId),
              isNull(organizationLootRecordTable.archivedAt),
            ),
          )
          .where(
            and(
              ...buildConditions(
                options.filters,
                options.permissions,
                options.roles,
              ),
            ),
          )
          .pipe(Effect.map((rows) => rows[0]?.value ?? 0)),
      ),
    );
  }

  async findOne(options: {
    guildId: string;
    permissions: ReadonlyArray<string>;
    roles: ReadonlyArray<VisibilityRole>;
    filters: LootQueryFilters;
  }) {
    const [lootId] = await this.findIds({ ...options, limit: 1 });
    if (lootId === undefined) return null;
    const [loot] = await this.hydrate(options.guildId, [lootId]);
    return loot ?? null;
  }

  async resolveItemByHid(options: {
    guildId: string;
    permissions: ReadonlyArray<string>;
    roles: ReadonlyArray<VisibilityRole>;
    hid: string;
    world?: string;
  }) {
    const [lootId] = await this.findIds({
      ...options,
      filters: { hid: options.hid, world: options.world },
      limit: 1,
    });
    if (lootId === undefined) return null;
    const rows = await this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .select({ hid: lootItemTable.hid, itemSnapshot: itemSnapshotTable })
          .from(lootItemTable)
          .innerJoin(
            itemSnapshotTable,
            eq(itemSnapshotTable.id, lootItemTable.itemSnapshotId),
          )
          .where(
            and(
              eq(lootItemTable.lootId, lootId),
              eq(lootItemTable.hid, options.hid),
            ),
          )
          .orderBy(asc(lootItemTable.id))
          .limit(1),
      ),
    );
    return rows[0] ?? null;
  }

  private findIds(options: {
    guildId: string;
    permissions: ReadonlyArray<string>;
    roles: ReadonlyArray<VisibilityRole>;
    filters: LootQueryFilters;
    limit: number;
  }) {
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .select({ id: lootTable.id })
          .from(lootTable)
          .innerJoin(
            organizationLootRecordTable,
            and(
              eq(organizationLootRecordTable.lootId, lootTable.id),
              eq(organizationLootRecordTable.guildId, options.guildId),
              isNull(organizationLootRecordTable.archivedAt),
            ),
          )
          .where(
            and(
              ...buildConditions(
                options.filters,
                options.permissions,
                options.roles,
              ),
            ),
          )
          .orderBy(desc(lootTable.id))
          .limit(options.limit)
          .pipe(Effect.map((rows) => rows.map(({ id }) => id))),
      ),
    );
  }

  private async hydrate(guildId: string, lootIds: ReadonlyArray<number>) {
    if (lootIds.length === 0) return [];
    const [loots, records, items, players, npcs, submissions, commentCounts] =
      await Promise.all([
        this.selectLoots(lootIds),
        this.selectRecords(guildId, lootIds),
        this.selectItems(lootIds),
        this.selectPlayers(lootIds),
        this.selectNpcs(lootIds),
        this.selectSubmissions(guildId, lootIds),
        this.selectCommentCounts(guildId, lootIds),
      ]);
    const byLoot = <Value extends { lootId: number }>(
      values: ReadonlyArray<Value>,
    ) => {
      const result = new Map<number, Value[]>();
      for (const value of values)
        result.set(value.lootId, [...(result.get(value.lootId) ?? []), value]);
      return result;
    };
    const itemsByLoot = byLoot(items);
    const playersByLoot = byLoot(players);
    const npcsByLoot = byLoot(npcs);
    const submissionsByLoot = byLoot(submissions);
    const recordsByLoot = new Map(
      records.map((record) => [record.lootId, record]),
    );
    const commentsByRecord = new Map(
      commentCounts.map((entry) => [entry.recordId, entry.count]),
    );
    return loots.map((loot) => ({
      ...loot,
      lootItems: (itemsByLoot.get(loot.id) ?? []).map(
        ({ lootId: _lootId, ...item }) => item,
      ),
      lootPlayers: (playersByLoot.get(loot.id) ?? []).map(
        ({ lootId: _lootId, ...player }) => player,
      ),
      lootNpcs: (npcsByLoot.get(loot.id) ?? []).map(
        ({ lootId: _lootId, ...npc }) => npc,
      ),
      submissions: submissionsByLoot.get(loot.id) ?? [],
      commentsCount:
        commentsByRecord.get(recordsByLoot.get(loot.id)?.id ?? -1) ?? 0,
    }));
  }

  private selectLoots(ids: ReadonlyArray<number>) {
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (db) =>
        db
          .select()
          .from(lootTable)
          .where(inArray(lootTable.id, [...ids]))
          .orderBy(desc(lootTable.id)),
      ),
    );
  }
  private selectRecords(guildId: string, ids: ReadonlyArray<number>) {
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (db) =>
        db
          .select()
          .from(organizationLootRecordTable)
          .where(
            and(
              eq(organizationLootRecordTable.guildId, guildId),
              isNull(organizationLootRecordTable.archivedAt),
              inArray(organizationLootRecordTable.lootId, [...ids]),
            ),
          ),
      ),
    );
  }
  private selectItems(ids: ReadonlyArray<number>) {
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (db) =>
        db
          .select({
            lootId: lootItemTable.lootId,
            hid: lootItemTable.hid,
            itemSnapshot: itemSnapshotTable,
          })
          .from(lootItemTable)
          .innerJoin(
            itemSnapshotTable,
            eq(itemSnapshotTable.id, lootItemTable.itemSnapshotId),
          )
          .where(inArray(lootItemTable.lootId, [...ids]))
          .orderBy(asc(lootItemTable.id)),
      ),
    );
  }
  private selectPlayers(ids: ReadonlyArray<number>) {
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (db) =>
        db
          .select({
            lootId: lootPlayerTable.lootId,
            lvl: lootPlayerTable.lvl,
            hpp: lootPlayerTable.hpp,
            playerSnapshot: playerSnapshotTable,
          })
          .from(lootPlayerTable)
          .innerJoin(
            playerSnapshotTable,
            eq(playerSnapshotTable.id, lootPlayerTable.playerSnapshotId),
          )
          .where(inArray(lootPlayerTable.lootId, [...ids]))
          .orderBy(asc(lootPlayerTable.id)),
      ),
    );
  }
  private selectNpcs(ids: ReadonlyArray<number>) {
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (db) =>
        db
          .select({
            lootId: lootNpcTable.lootId,
            npcSnapshot: npcSnapshotTable,
          })
          .from(lootNpcTable)
          .innerJoin(
            npcSnapshotTable,
            eq(npcSnapshotTable.id, lootNpcTable.npcSnapshotId),
          )
          .where(inArray(lootNpcTable.lootId, [...ids]))
          .orderBy(asc(lootNpcTable.id)),
      ),
    );
  }
  private selectSubmissions(guildId: string, ids: ReadonlyArray<number>) {
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (db) =>
        db
          .select({
            lootId: organizationLootRecordTable.lootId,
            memberId: lootSubmissionTable.memberId,
            member: {
              name: memberTable.name,
              avatar: memberTable.avatar,
              userId: memberTable.userId,
            },
          })
          .from(lootSubmissionTable)
          .innerJoin(
            organizationLootRecordTable,
            eq(
              organizationLootRecordTable.id,
              lootSubmissionTable.organizationLootRecordId,
            ),
          )
          .innerJoin(
            memberTable,
            eq(memberTable.id, lootSubmissionTable.memberId),
          )
          .where(
            and(
              eq(organizationLootRecordTable.guildId, guildId),
              isNull(organizationLootRecordTable.archivedAt),
              inArray(organizationLootRecordTable.lootId, [...ids]),
            ),
          ),
      ),
    );
  }
  private selectCommentCounts(guildId: string, ids: ReadonlyArray<number>) {
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (db) =>
        db
          .select({
            recordId: organizationLootRecordTable.id,
            count: count(lootCommentTable.id),
          })
          .from(organizationLootRecordTable)
          .leftJoin(
            lootCommentTable,
            eq(
              lootCommentTable.organizationLootRecordId,
              organizationLootRecordTable.id,
            ),
          )
          .where(
            and(
              eq(organizationLootRecordTable.guildId, guildId),
              inArray(organizationLootRecordTable.lootId, [...ids]),
            ),
          )
          .groupBy(organizationLootRecordTable.id),
      ),
    );
  }
}
