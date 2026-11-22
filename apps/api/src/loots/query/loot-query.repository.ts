import { adapterOperation } from "@lootlog/instrumentation/operation";
import { LootSummary, LootShareResponse } from "@lootlog/protocol/loot-summary";
import {
  mapItem,
  mapPlayer,
  mapNpc,
} from "#src/loots/query/loot-snapshot-mappers";
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  max,
  sql,
  sum,
} from "drizzle-orm";
import { Effect, Schema } from "effect";
import type { ProfessionEnum } from "@lootlog/schema/loot";
import { ApiDatabase } from "#src/database/drizzle/database";
import { containsPattern } from "#src/shared/sql-like";
import {
  itemSnapshotTable,
  lootCommentTable,
  lootDrawTable,
  lootLikeTable,
  lootItemTable,
  lootMapPlayerTable,
  lootNpcTable,
  lootPlayerTable,
  lootSubmissionTable,
  lootTable,
  npcSnapshotTable,
  organizationLootRecordTable,
  playerSnapshotTable,
} from "#src/database/drizzle/loot.schema";
import { memberTable } from "#src/database/drizzle/organization.schema";
import {
  buildLootQueryConditions,
  lootQuerySource,
  organizationLootRecordQuerySource,
  LOOT_SEARCH_SNAPSHOT_LIMIT,
  lootSearchMatchesNothing,
  type LootQueryFilters,
  type LootQueryVisibilityRole,
  type ResolvedLootQueryFilters,
  type ResolvedLootSearch,
} from "#src/loots/query/loot-query-filter";

export const makeLootQueryPersistence = (
  database: Pick<typeof ApiDatabase.Service, "select">,
) => {
  const protect = adapterOperation("loots.drizzle");

  const findItemSnapshotIds = (names: ReadonlyArray<string>) =>
    names.length === 0
      ? Effect.succeed([])
      : protect(
          "loots.query.item-snapshots",
          database
            .select({ id: itemSnapshotTable.id })
            .from(itemSnapshotTable)
            .where(inArray(itemSnapshotTable.name, [...names])),
        );

  const findNpcNameSnapshotIds = (names: ReadonlyArray<string>) =>
    protect(
      "loots.query.npc-snapshots",
      database
        .select({ id: npcSnapshotTable.id })
        .from(npcSnapshotTable)
        .where(inArray(npcSnapshotTable.name, [...names]))
        .pipe(Effect.map((rows) => rows.map(({ id }) => id))),
    );

  const searchSnapshotSources = {
    item: itemSnapshotTable,
    npc: npcSnapshotTable,
    player: playerSnapshotTable,
  } as const;

  const findSearchSnapshotIds = (
    relation: keyof typeof searchSnapshotSources,
    pattern: string,
  ) => {
    const source = searchSnapshotSources[relation];

    return protect(
      `loots.query.search-${relation}-snapshots`,
      database
        .select({ id: source.id })
        .from(source)
        .where(ilike(source.name, pattern))
        .limit(LOOT_SEARCH_SNAPSHOT_LIMIT + 1)
        .pipe(
          Effect.map((rows) =>
            rows.length > LOOT_SEARCH_SNAPSHOT_LIMIT
              ? null
              : rows.map(({ id }) => id),
          ),
        ),
    );
  };

  const resolveSearch = Effect.fn("loots.query.resolve-search")(function* (
    search: string | undefined,
  ) {
    const value = search?.trim();

    if (!value) return undefined;
    const pattern = containsPattern(value);

    const [itemSnapshotIds, npcSnapshotIds, playerSnapshotIds] =
      yield* Effect.all(
        [
          findSearchSnapshotIds("item", pattern),
          findSearchSnapshotIds("npc", pattern),
          findSearchSnapshotIds("player", pattern),
        ] as const,
        { concurrency: "unbounded" },
      );

    return {
      pattern: value,
      itemSnapshotIds,
      npcSnapshotIds,
      playerSnapshotIds,
    } satisfies ResolvedLootSearch;
  });

  const resolveQueryFilters = Effect.fn("loots.query.resolve-filters")(
    function* (filters: LootQueryFilters) {
      const { npcs, search, ...rest } = filters;

      const [npcNameSnapshotIds, resolvedSearch] = yield* Effect.all(
        [
          npcs?.length
            ? findNpcNameSnapshotIds(npcs)
            : Effect.succeed(undefined),
          resolveSearch(search),
        ] as const,
        { concurrency: "unbounded" },
      );

      return {
        ...rest,
        npcNameSnapshotIds,
        search: resolvedSearch,
      } satisfies ResolvedLootQueryFilters;
    },
  );

  const activeOrganizationRecord = (guildId: string) =>
    and(
      eq(organizationLootRecordTable.lootId, lootTable.id),
      eq(organizationLootRecordTable.guildId, guildId),
      isNull(organizationLootRecordTable.archivedAt),
    );

  const activeRecordsOfOrganization = (guildId: string) =>
    and(
      eq(organizationLootRecordTable.guildId, guildId),
      isNull(organizationLootRecordTable.archivedAt),
    );

  const findIds = (options: {
    readonly guildId: string;
    readonly permissions: ReadonlyArray<string>;
    readonly roles: ReadonlyArray<LootQueryVisibilityRole>;
    readonly filters: LootQueryFilters;
    readonly limit: number;
  }) =>
    resolveQueryFilters(options.filters).pipe(
      Effect.flatMap((filters) =>
        filters.search && lootSearchMatchesNothing(filters.search)
          ? Effect.succeed<Array<number>>([])
          : protect(
              "loots.query.ids",
              database
                .select({ id: organizationLootRecordTable.lootId })
                .from(organizationLootRecordTable)
                .where(
                  and(
                    activeRecordsOfOrganization(options.guildId),
                    ...buildLootQueryConditions(
                      organizationLootRecordQuerySource,
                      filters,
                      options.permissions,
                      options.roles,
                    ),
                  ),
                )
                .orderBy(desc(organizationLootRecordTable.lootId))
                .limit(options.limit)
                .pipe(Effect.map((rows) => rows.map(({ id }) => id))),
            ),
      ),
    );

  const countRarity = (
    rarity: NonNullable<typeof itemSnapshotTable.$inferSelect.rarity>,
  ) =>
    sql<number>`count(*) filter (where ${eq(itemSnapshotTable.rarity, rarity)})`.mapWith(
      Number,
    );

  const summarizeByNpcName = (options: {
    readonly guildId: string;
    readonly permissions: ReadonlyArray<string>;
    readonly roles: ReadonlyArray<LootQueryVisibilityRole>;
    readonly filters: LootQueryFilters;
  }) =>
    resolveQueryFilters(options.filters).pipe(
      Effect.flatMap((filters) => {
        if (filters.search && lootSearchMatchesNothing(filters.search))
          return Effect.succeed({ lootCount: 0, npcs: [] });

        const lootRarities = database
          .select({
            lootId: lootTable.id,
            unique: countRarity("UNIQUE").as("unique_items"),
            heroic: countRarity("HEROIC").as("heroic_items"),
            legendary: countRarity("LEGENDARY").as("legendary_items"),
            lootCount: sql<number>`count(*) over ()`.as("loot_count"),
          })
          .from(lootTable)
          .innerJoin(
            organizationLootRecordTable,
            activeOrganizationRecord(options.guildId),
          )
          .leftJoin(lootItemTable, eq(lootItemTable.lootId, lootTable.id))
          .leftJoin(
            itemSnapshotTable,
            eq(itemSnapshotTable.id, lootItemTable.itemSnapshotId),
          )
          .where(
            and(
              ...buildLootQueryConditions(
                lootQuerySource,
                filters,
                options.permissions,
                options.roles,
              ),
            ),
          )
          .groupBy(lootTable.id)
          .as("loot_rarities");

        return protect(
          "loots.query.npc-summary",
          database
            .select({
              name: npcSnapshotTable.name,
              encounters: count(lootNpcTable.id),
              unique: sum(lootRarities.unique).mapWith(Number),
              heroic: sum(lootRarities.heroic).mapWith(Number),
              legendary: sum(lootRarities.legendary).mapWith(Number),
              lootCount: max(lootRarities.lootCount).mapWith(Number),
            })
            .from(lootRarities)
            .leftJoin(
              lootNpcTable,
              eq(lootNpcTable.lootId, lootRarities.lootId),
            )
            .leftJoin(
              npcSnapshotTable,
              eq(npcSnapshotTable.id, lootNpcTable.npcSnapshotId),
            )
            .groupBy(npcSnapshotTable.name)
            .pipe(
              Effect.map((rows) => ({
                lootCount: rows[0]?.lootCount ?? 0,
                npcs: rows.flatMap(({ name, lootCount: _lootCount, ...row }) =>
                  name === null ? [] : [{ name, ...row }],
                ),
              })),
            ),
        );
      }),
    );

  const selectLoots = (ids: ReadonlyArray<number>) =>
    database
      .select()
      .from(lootTable)
      .where(inArray(lootTable.id, [...ids]))
      .orderBy(desc(lootTable.id));

  const selectItems = (ids: ReadonlyArray<number>) =>
    database
      .select({
        lootId: lootItemTable.lootId,
        hid: lootItemTable.hid,
        instanceStat: lootItemTable.instanceStat,
        itemSnapshot: itemSnapshotTable,
      })
      .from(lootItemTable)
      .innerJoin(
        itemSnapshotTable,
        eq(itemSnapshotTable.id, lootItemTable.itemSnapshotId),
      )
      .where(inArray(lootItemTable.lootId, [...ids]))
      .orderBy(asc(lootItemTable.id));

  const selectPlayers = (ids: ReadonlyArray<number>) =>
    database
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
      .orderBy(asc(lootPlayerTable.id));

  const selectNpcs = (ids: ReadonlyArray<number>) =>
    database
      .select({ lootId: lootNpcTable.lootId, npcSnapshot: npcSnapshotTable })
      .from(lootNpcTable)
      .innerJoin(
        npcSnapshotTable,
        eq(npcSnapshotTable.id, lootNpcTable.npcSnapshotId),
      )
      .where(inArray(lootNpcTable.lootId, [...ids]))
      .orderBy(asc(lootNpcTable.id));

  const selectSubmissions = (guildId: string, ids: ReadonlyArray<number>) =>
    database
      .select({
        lootId: organizationLootRecordTable.lootId,
        memberId: lootSubmissionTable.memberId,
        member: {
          id: memberTable.id,
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
      .innerJoin(memberTable, eq(memberTable.id, lootSubmissionTable.memberId))
      .where(
        and(
          eq(organizationLootRecordTable.guildId, guildId),
          isNull(organizationLootRecordTable.archivedAt),
          inArray(organizationLootRecordTable.lootId, [...ids]),
        ),
      );

  const selectMapPlayers = (guildId: string, ids: ReadonlyArray<number>) =>
    database
      .select({
        lootId: organizationLootRecordTable.lootId,
        accountId: playerSnapshotTable.accountId,
        characterId: playerSnapshotTable.characterId,
        name: playerSnapshotTable.name,
        prof: playerSnapshotTable.prof,
        icon: playerSnapshotTable.icon,
        lvl: lootMapPlayerTable.lvl,
      })
      .from(organizationLootRecordTable)
      .innerJoin(
        lootMapPlayerTable,
        eq(
          lootMapPlayerTable.organizationLootRecordId,
          organizationLootRecordTable.id,
        ),
      )
      .innerJoin(
        playerSnapshotTable,
        eq(playerSnapshotTable.id, lootMapPlayerTable.playerSnapshotId),
      )
      .where(
        and(
          eq(organizationLootRecordTable.guildId, guildId),
          isNull(organizationLootRecordTable.archivedAt),
          inArray(organizationLootRecordTable.lootId, [...ids]),
        ),
      )
      .orderBy(
        asc(playerSnapshotTable.accountId),
        asc(playerSnapshotTable.characterId),
        asc(playerSnapshotTable.id),
      );

  const selectCommentCounts = (guildId: string, ids: ReadonlyArray<number>) =>
    database
      .select({
        lootId: organizationLootRecordTable.lootId,
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
          isNull(organizationLootRecordTable.archivedAt),
          inArray(organizationLootRecordTable.lootId, [...ids]),
        ),
      )
      .groupBy(organizationLootRecordTable.lootId);

  const selectLikes = (guildId: string, ids: ReadonlyArray<number>) =>
    database
      .select({
        lootId: organizationLootRecordTable.lootId,
        id: memberTable.id,
        name: memberTable.name,
        avatar: memberTable.avatar,
        userId: memberTable.userId,
      })
      .from(lootLikeTable)
      .innerJoin(
        organizationLootRecordTable,
        eq(
          organizationLootRecordTable.id,
          lootLikeTable.organizationLootRecordId,
        ),
      )
      .innerJoin(memberTable, eq(memberTable.id, lootLikeTable.memberId))
      .where(
        and(
          eq(organizationLootRecordTable.guildId, guildId),
          isNull(organizationLootRecordTable.archivedAt),
          inArray(organizationLootRecordTable.lootId, [...ids]),
        ),
      )
      .orderBy(asc(lootLikeTable.createdAt), asc(lootLikeTable.memberId));

  const selectStandingDraws = (guildId: string, ids: ReadonlyArray<number>) =>
    database
      .select({
        lootId: organizationLootRecordTable.lootId,
        drawId: lootDrawTable.id,
        itemHid: lootDrawTable.itemHid,
        winnerName: sql<string>`${lootDrawTable.entrants} -> ${lootDrawTable.winnerIndex} ->> 'name'`,
        winnerProf: sql<ProfessionEnum | null>`${lootDrawTable.entrants} -> ${lootDrawTable.winnerIndex} ->> 'prof'`,
        winnerLvl: sql<
          number | null
        >`(${lootDrawTable.entrants} -> ${lootDrawTable.winnerIndex} ->> 'lvl')::int`,
      })
      .from(lootDrawTable)
      .innerJoin(
        organizationLootRecordTable,
        eq(
          organizationLootRecordTable.id,
          lootDrawTable.organizationLootRecordId,
        ),
      )
      .where(
        and(
          eq(organizationLootRecordTable.guildId, guildId),
          isNull(organizationLootRecordTable.archivedAt),
          inArray(organizationLootRecordTable.lootId, [...ids]),
          isNull(lootDrawTable.voidedAt),
        ),
      )
      .orderBy(asc(lootDrawTable.id));

  const hydrate = (guildId: string, lootIds: ReadonlyArray<number>) => {
    if (lootIds.length === 0) return Effect.succeed([]);

    return protect(
      "loots.query.hydrate",
      Effect.all(
        [
          selectLoots(lootIds),
          selectItems(lootIds),
          selectPlayers(lootIds),
          selectNpcs(lootIds),
          selectSubmissions(guildId, lootIds),
          selectCommentCounts(guildId, lootIds),
          selectMapPlayers(guildId, lootIds),
          selectLikes(guildId, lootIds),
          selectStandingDraws(guildId, lootIds),
        ] as const,
        { concurrency: "unbounded" },
      ).pipe(
        Effect.map(
          ([
            loots,
            items,
            players,
            npcs,
            submissions,
            commentCounts,
            mapPlayers,
            likes,
            standingDraws,
          ]) => {
            const itemsByLoot = Map.groupBy(items, ({ lootId }) => lootId);
            const playersByLoot = Map.groupBy(players, ({ lootId }) => lootId);

            const mapPlayersByLoot = Map.groupBy(
              mapPlayers,
              ({ lootId }) => lootId,
            );

            const npcsByLoot = Map.groupBy(npcs, ({ lootId }) => lootId);

            const submissionsByLoot = Map.groupBy(
              submissions,
              ({ lootId }) => lootId,
            );

            const likesByLoot = Map.groupBy(likes, ({ lootId }) => lootId);

            const drawsByLoot = Map.groupBy(
              standingDraws,
              ({ lootId }) => lootId,
            );

            const commentsByLoot = new Map(
              commentCounts.map(
                (entry) => [entry.lootId, entry.count] as const,
              ),
            );

            return loots.map((loot) => ({
              ...loot,
              mapPlayersSnapshot:
                mapPlayersByLoot
                  .get(loot.id)
                  ?.map(({ lootId: _lootId, ...player }) => player) ?? null,
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
              commentsCount: commentsByLoot.get(loot.id) ?? 0,
              likes: (likesByLoot.get(loot.id) ?? []).map(
                ({ lootId: _lootId, ...member }) => member,
              ),
              standingDraws: (drawsByLoot.get(loot.id) ?? []).map((draw) => ({
                drawId: draw.drawId,
                itemHid: draw.itemHid,
                winner: {
                  name: draw.winnerName,
                  prof: draw.winnerProf,
                  lvl: draw.winnerLvl,
                },
              })),
            }));
          },
        ),
      ),
    );
  };

  const findMany = (options: {
    readonly guildId: string;
    readonly permissions: ReadonlyArray<string>;
    readonly roles: ReadonlyArray<LootQueryVisibilityRole>;
    readonly filters: LootQueryFilters;
    readonly limit: number;
  }) =>
    Effect.flatMap(findIds(options), (lootIds) =>
      hydrate(options.guildId, lootIds),
    );

  const findOne = (options: {
    readonly guildId: string;
    readonly permissions: ReadonlyArray<string>;
    readonly roles: ReadonlyArray<LootQueryVisibilityRole>;
    readonly filters: LootQueryFilters;
  }) =>
    Effect.gen(function* () {
      const [lootId] = yield* findIds({ ...options, limit: 1 });

      if (lootId === undefined) return null;
      const [loot] = yield* hydrate(options.guildId, [lootId]);

      return loot ?? null;
    });

  const resolveItemByHid = (options: {
    readonly guildId: string;
    readonly permissions: ReadonlyArray<string>;
    readonly roles: ReadonlyArray<LootQueryVisibilityRole>;
    readonly hid: string;
    readonly world?: string;
  }) =>
    Effect.gen(function* () {
      const [lootId] = yield* findIds({
        ...options,
        filters: { hid: options.hid, world: options.world },
        limit: 1,
      });

      if (lootId === undefined) return null;

      const rows = yield* protect(
        "loots.query.resolve-item",
        database
          .select({
            hid: lootItemTable.hid,
            instanceStat: lootItemTable.instanceStat,
            itemSnapshot: itemSnapshotTable,
          })
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
      );

      return rows[0] ?? null;
    });

  const readVisibleSummaries = (ids: ReadonlyArray<number>) =>
    Effect.gen(function* () {
      if (ids.length === 0) return new Map<number, LootSummary>();

      const [loots, items, players, npcs] = yield* Effect.all(
        [
          selectLoots(ids),
          selectItems(ids),
          selectPlayers(ids),
          selectNpcs(ids),
        ],
        { concurrency: "unbounded" },
      );

      const summaries = new Map<number, LootSummary>();

      for (const loot of loots) {
        const lootShare = yield* Schema.decodeUnknownEffect(LootShareResponse)(
          loot.lootShare,
        );

        summaries.set(loot.id, {
          location: loot.location,
          lootShare,
          items: items.filter((item) => item.lootId === loot.id).map(mapItem),
          players: players
            .filter((player) => player.lootId === loot.id)
            .map(mapPlayer),
          npcs: npcs.filter((npc) => npc.lootId === loot.id).map(mapNpc),
        });
      }

      return summaries;
    });

  return {
    findIds,
    readVisibleSummaries,
    findItemSnapshotIds,
    findMany,
    findOne,
    resolveItemByHid,
    summarizeByNpcName,
  } as const;
};

export type LootQueryPersistence = ReturnType<typeof makeLootQueryPersistence>;
