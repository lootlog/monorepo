import { LootSummary, LootShareResponse } from "@lootlog/protocol/loot-summary";
import {
  mapItem,
  mapPlayer,
  mapNpc,
} from "#src/loots/query/loot-snapshot-mappers";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { and, asc, count, desc, eq, ilike, inArray, isNull } from "drizzle-orm";
import { Effect, Schema } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  itemSnapshotTable,
  lootCommentTable,
  lootItemTable,
  lootMapPlayerTable,
  lootNpcTable,
  lootPlayerTable,
  lootSubmissionTable,
  lootTable,
  memberTable,
  npcSnapshotTable,
  organizationLootRecordTable,
  playerSnapshotTable,
} from "#src/database/drizzle/schema";
import {
  buildLootQueryConditions,
  LOOT_SEARCH_SNAPSHOT_LIMIT,
  lootSearchMatchesNothing,
  type LootQueryFilters,
  type LootQueryVisibilityRole,
  type ResolvedLootQueryFilters,
  type ResolvedLootSearch,
} from "#src/loots/query/loot-query-filter";

class LootQueryPersistenceError extends TaggedErrorClass<LootQueryPersistenceError>()(
  "LootQueryPersistenceError",
  { operation: Schema.String, cause: Schema.Defect() },
) {}

export const makeLootQueryPersistence = (
  database: Pick<typeof ApiDatabase.Service, "select">,
) => {
  const protect = <A, E>(operation: string, effect: Effect.Effect<A, E>) =>
    effect.pipe(
      Effect.mapError(
        (cause) => new LootQueryPersistenceError({ operation, cause }),
      ),
      Effect.withSpan(operation, {
        attributes: { adapter: "loots.drizzle", retryCount: 0 },
      }),
    );

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

  // One more row than the limit distinguishes an enumerable term from one that
  // matches too many snapshots to send as an array.
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

  // Resolving the term first turns every arm into an indexed membership test.
  // The correlated form it replaces read a snapshot row and ran ILIKE for each
  // loot the descending scan examined, so a term matching nothing paid for the
  // whole Organization before returning no rows.
  //
  // This is the fallback for names the search service has not indexed. It
  // reads the same snapshot rows the loot list already owns, so a missing or
  // stale search index cannot hide a loot from its Organization.
  const resolveSearch = Effect.fn("loots.query.resolve-search")(function* (
    search: string | undefined,
  ) {
    const value = search?.trim();

    if (!value) return undefined;
    const pattern = `%${value}%`;

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

  // Resolve names once so the page query can use LootNpc statistics and avoid
  // repeated NpcSnapshot probes. Keep type/level predicates independent: they
  // may match a different NPC in the same encounter.
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
                    ...buildLootQueryConditions(
                      filters,
                      options.permissions,
                      options.roles,
                    ),
                  ),
                )
                .orderBy(desc(lootTable.id))
                .limit(options.limit)
                .pipe(Effect.map((rows) => rows.map(({ id }) => id))),
            ),
      ),
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
          ]) => {
            const byLoot = <Value extends { lootId: number }>(
              values: ReadonlyArray<Value>,
            ) => {
              const result = new Map<number, Value[]>();

              for (const value of values) {
                const group = result.get(value.lootId);

                if (group) group.push(value);
                else result.set(value.lootId, [value]);
              }

              return result;
            };

            const itemsByLoot = byLoot(items);
            const playersByLoot = byLoot(players);
            const mapPlayersByLoot = byLoot(mapPlayers);
            const npcsByLoot = byLoot(npcs);
            const submissionsByLoot = byLoot(submissions);

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
      );

      return rows[0] ?? null;
    });

  // Callers must resolve source visibility before passing these shared loot IDs.
  const readVisibleSummaries = (ids: ReadonlyArray<number>) =>
    Effect.gen(function* () {
      if (ids.length === 0) return new Map<number, LootSummary>();

      const [loots, items, players, npcs] = yield* Effect.all([
        selectLoots(ids),
        selectItems(ids),
        selectPlayers(ids),
        selectNpcs(ids),
      ]);

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
  } as const;
};

export type LootQueryPersistence = ReturnType<typeof makeLootQueryPersistence>;
