import { LootSummary, LootShareResponse } from "@lootlog/protocol/loot-summary";
import {
  mapItem,
  mapPlayer,
  mapNpc,
} from "#src/loots/query/loot-snapshot-mappers";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import {
  and,
  asc,
  count,
  countDistinct,
  desc,
  eq,
  inArray,
  isNull,
} from "drizzle-orm";
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
  type LootQueryFilters,
  type LootQueryVisibilityRole,
} from "#src/loots/query/loot-query-filter";

export class LootQueryPersistenceError extends TaggedErrorClass<LootQueryPersistenceError>()(
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
      ? Effect.succeed([] as ReadonlyArray<{ id: number }>)
      : protect(
          "loots.query.item-snapshots",
          database
            .select({ id: itemSnapshotTable.id })
            .from(itemSnapshotTable)
            .where(inArray(itemSnapshotTable.name, [...names])),
        );

  const findIds = (options: {
    readonly guildId: string;
    readonly permissions: ReadonlyArray<string>;
    readonly roles: ReadonlyArray<LootQueryVisibilityRole>;
    readonly filters: LootQueryFilters;
    readonly limit: number;
  }) =>
    protect(
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
              options.filters,
              options.permissions,
              options.roles,
            ),
          ),
        )
        .orderBy(desc(lootTable.id))
        .limit(options.limit)
        .pipe(Effect.map((rows) => rows.map(({ id }) => id))),
    );

  const selectLoots = (ids: ReadonlyArray<number>) =>
    database
      .select()
      .from(lootTable)
      .where(inArray(lootTable.id, [...ids]))
      .orderBy(desc(lootTable.id));
  const selectRecords = (guildId: string, ids: ReadonlyArray<number>) =>
    database
      .select()
      .from(organizationLootRecordTable)
      .where(
        and(
          eq(organizationLootRecordTable.guildId, guildId),
          isNull(organizationLootRecordTable.archivedAt),
          inArray(organizationLootRecordTable.lootId, [...ids]),
        ),
      );
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
      .groupBy(organizationLootRecordTable.id);

  const hydrate = (guildId: string, lootIds: ReadonlyArray<number>) => {
    if (lootIds.length === 0) return Effect.succeed([]);
    return protect(
      "loots.query.hydrate",
      Effect.all(
        [
          selectLoots(lootIds),
          selectRecords(guildId, lootIds),
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
            records,
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
            const recordsByLoot = new Map(
              records.map((record) => [record.lootId, record] as const),
            );
            const commentsByRecord = new Map(
              commentCounts.map(
                (entry) => [entry.recordId, entry.count] as const,
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
              commentsCount:
                commentsByRecord.get(recordsByLoot.get(loot.id)?.id ?? -1) ?? 0,
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

  const countLoots = (options: {
    readonly guildId: string;
    readonly permissions: ReadonlyArray<string>;
    readonly roles: ReadonlyArray<LootQueryVisibilityRole>;
    readonly filters: LootQueryFilters;
  }) =>
    protect(
      "loots.query.count",
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
            ...buildLootQueryConditions(
              options.filters,
              options.permissions,
              options.roles,
            ),
          ),
        )
        .pipe(Effect.map((rows) => rows[0]?.value ?? 0)),
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
    readVisibleSummaries,
    findItemSnapshotIds,
    findMany,
    count: countLoots,
    findOne,
    resolveItemByHid,
  } as const;
};

export type LootQueryPersistence = ReturnType<typeof makeLootQueryPersistence>;
