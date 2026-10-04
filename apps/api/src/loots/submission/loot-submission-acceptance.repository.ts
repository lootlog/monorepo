import {
  captureLootMapPlayers,
  mapPlayersToSnapshotInputs,
} from "./loot-map-players.persistence.js";
import {
  resolveItemSnapshotIds,
  resolveNpcSnapshots,
} from "./loot-snapshot.persistence.js";
import { resolvePlayerSnapshots } from "#src/shared/margonem/player-snapshot.persistence";
import type { MapPlayersSnapshot } from "#src/contracts/loots/map-players-snapshot";
import { selectAccessibleGuilds } from "#src/members/member-access-query";
import { DependencyUnavailableError } from "#src/shared/http/http-errors";
import { and, desc, eq, inArray, isNull, ne, or } from "drizzle-orm";
import { Clock, Effect } from "effect";
import { omit, zip } from "es-toolkit";
import { lootPublicationOutboxTable } from "#src/database/drizzle/loot-publication-outbox.schema";
import type { LootPublication } from "./loot-publication-outbox.js";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  guildTable,
  lootItemTable,
  lootlogConfigNpcTable,
  lootlogConfigTable,
  lootNpcTable,
  lootPlayerTable,
  lootSubmissionTable,
  lootTable,
  memberTable,
  npcSnapshotTable,
  organizationLootRecordTable,
  userCharactersLootlogSettingsTable,
} from "#src/database/drizzle/schema";
import type { Permission } from "@lootlog/schema/permissions";
import type { NpcIdentityNamespace } from "@lootlog/schema/npc-identity";
import {
  NpcTypeEnum as NpcTypeValue,
  type NpcTypeEnum as NpcType,
} from "@lootlog/schema/npc-type";
import type { ItemRarityEnum as ItemRarity } from "@lootlog/schema/item-rarity";
import type {
  LootShareSourceEnum as LootShareSource,
  LootSourceEnum as LootSource,
  ProfessionEnum as Profession,
} from "@lootlog/schema/loot";
import type { GameVersion } from "@lootlog/schema/game-version";

export type AcceptedNpcSnapshot = typeof npcSnapshotTable.$inferSelect;

export type PersistedLootSubmission = {
  guildId: string;
  memberId: number;
};

export type NewLootPersistence = {
  mapPlayersSnapshot: MapPlayersSnapshot | null;
  uniqueId: string;
  world: string;
  gameVersion: GameVersion;
  source: LootSource;
  location: string;
  lootShare: Record<string, string[]>;
  lootShareSource: LootShareSource;
  items: Array<{
    itemId: number;
    gameVersion: GameVersion;
    statsHash: string;
    snapshotHash: string;
    name: string;
    icon: string;
    lvl: number;
    rarity: ItemRarity;
    itemType: string;
    statRaw: string;
    statsSnapshot: Record<string, string>;
    hid: string;
    instanceStat: string | null;
  }>;
  players: Array<{
    world: string;
    accountId: number;
    characterId: number;
    name: string;
    prof: Profession | null;
    icon: string;
    lvl: number;
  }>;
  npcs: Array<{
    npcId: number;
    identityNamespace: NpcIdentityNamespace;
    runtimeNpcId: number | null;
    name: string;
    type: NpcType;
    lvl: number;
    icon: string;
    wt: number;
    margonemType: number;
    prof: Profession | null;
  }>;
  submissions: PersistedLootSubmission[];
};

export interface LootSubmissionAcceptancePersistence {
  readonly findGuildsForPermissions: (
    discordId: string,
    permissions: Permission[],
  ) => Effect.Effect<Array<typeof guildTable.$inferSelect>, unknown>;
  readonly findCharacterConfig: (
    userId: string,
    accountId: string,
    characterId: string,
  ) => Effect.Effect<
    typeof userCharactersLootlogSettingsTable.$inferSelect | null,
    unknown
  >;
  readonly findLootlogConfigs: (guildIds: string[]) => Effect.Effect<
    Array<
      typeof lootlogConfigTable.$inferSelect & {
        npcs: Array<typeof lootlogConfigNpcTable.$inferSelect>;
      }
    >,
    unknown
  >;
  readonly hasAmbiguousNpcVariant: (
    name: string,
  ) => Effect.Effect<boolean, unknown>;
  readonly findLootIdByUniqueId: (
    uniqueId: string,
  ) => Effect.Effect<number | null, unknown>;
  readonly findMembers: (
    discordId: string,
    guildIds: string[],
  ) => Effect.Effect<Array<{ id: number; guildId: string }>, unknown>;
  readonly findExistingRecords: (
    lootId: number,
    guildIds: string[],
  ) => Effect.Effect<
    Array<{
      guildId: string;
      archivedAt: Date | null;
      submissions: Array<{ memberId: number }>;
    }>,
    unknown
  >;
  readonly appendSubmissions: (
    lootId: number,
    submissions: PersistedLootSubmission[],
    publications: (
      organizationIds: string[],
      npcs: AcceptedNpcSnapshot[],
    ) => LootPublication[],
    mapPlayersSnapshot?: { guildIds: string[]; players: MapPlayersSnapshot },
  ) => Effect.Effect<
    Array<{ id: number; guildId: string; archivedAt: Date | null }>,
    unknown
  >;
  readonly createNewLoot: (
    data: NewLootPersistence,
    publications: (
      lootId: number,
      npcs: AcceptedNpcSnapshot[],
    ) => LootPublication[],
  ) => Effect.Effect<number, unknown>;
}

const toLootSubmissionRows = (
  records: Array<
    Pick<typeof organizationLootRecordTable.$inferSelect, "id" | "guildId">
  >,
  submissions: PersistedLootSubmission[],
  now: Date,
) => {
  const recordIdByGuildId = new Map(
    records.map((record) => [record.guildId, record.id]),
  );

  return submissions.map((submission) => {
    const organizationLootRecordId = recordIdByGuildId.get(submission.guildId);

    if (organizationLootRecordId === undefined) {
      throw new DependencyUnavailableError(
        "Failed to resolve Organization Loot record",
      );
    }

    return {
      organizationLootRecordId,
      memberId: submission.memberId,
      updatedAt: now,
    };
  });
};

export const makeLootSubmissionAcceptancePersistence = (
  database: typeof ApiDatabase.Service,
): LootSubmissionAcceptancePersistence => ({
  findGuildsForPermissions: (discordId, permissions) =>
    selectAccessibleGuilds(database, discordId, permissions).pipe(
      Effect.map((rows) => rows.map(({ guild }) => guild)),
    ),

  findCharacterConfig: (userId, accountId, characterId) =>
    database
      .select()
      .from(userCharactersLootlogSettingsTable)
      .where(
        and(
          eq(userCharactersLootlogSettingsTable.userId, userId),
          eq(userCharactersLootlogSettingsTable.accountId, accountId),
          eq(userCharactersLootlogSettingsTable.characterId, characterId),
        ),
      )
      .orderBy(desc(userCharactersLootlogSettingsTable.createdAt))
      .limit(1)
      .pipe(Effect.map((rows) => rows[0] ?? null)),

  findLootlogConfigs: (guildIds) => {
    if (guildIds.length === 0) return Effect.succeed([]);

    return Effect.gen(function* () {
      const configs = yield* database
        .select()
        .from(lootlogConfigTable)
        .where(inArray(lootlogConfigTable.id, guildIds));

      if (configs.length === 0) return [];

      const npcs = yield* database
        .select()
        .from(lootlogConfigNpcTable)
        .where(
          inArray(
            lootlogConfigNpcTable.lootlogConfigId,
            configs.map(({ id }) => id),
          ),
        )
        .orderBy(desc(lootlogConfigNpcTable.id));

      return configs.map((config) => ({
        ...config,
        npcs: npcs.filter(
          ({ lootlogConfigId }) => lootlogConfigId === config.id,
        ),
      }));
    });
  },

  hasAmbiguousNpcVariant: (name) =>
    database
      .select({ id: npcSnapshotTable.id })
      .from(npcSnapshotTable)
      .where(
        and(
          eq(npcSnapshotTable.name, name),
          or(
            ne(npcSnapshotTable.type, NpcTypeValue.COLOSSUS),
            isNull(npcSnapshotTable.type),
          ),
        ),
      )
      .limit(1)
      .pipe(Effect.map((rows) => rows.length > 0)),

  findLootIdByUniqueId: (uniqueId) =>
    database
      .select({ id: lootTable.id })
      .from(lootTable)
      .where(eq(lootTable.uniqueId, uniqueId))
      .limit(1)
      .pipe(Effect.map((rows) => rows[0]?.id ?? null)),

  findMembers: (discordId, guildIds) =>
    guildIds.length === 0
      ? Effect.succeed([])
      : database
          .select({ id: memberTable.id, guildId: memberTable.guildId })
          .from(memberTable)
          .where(
            and(
              inArray(memberTable.guildId, guildIds),
              eq(memberTable.userId, discordId),
            ),
          ),

  findExistingRecords: (lootId, guildIds) => {
    if (guildIds.length === 0) return Effect.succeed([]);

    return Effect.all(
      {
        records: database
          .select({
            id: organizationLootRecordTable.id,
            guildId: organizationLootRecordTable.guildId,
            archivedAt: organizationLootRecordTable.archivedAt,
          })
          .from(organizationLootRecordTable)
          .where(
            and(
              eq(organizationLootRecordTable.lootId, lootId),
              inArray(organizationLootRecordTable.guildId, guildIds),
            ),
          ),
        submissions: database
          .select({
            organizationLootRecordId:
              lootSubmissionTable.organizationLootRecordId,
            memberId: lootSubmissionTable.memberId,
          })
          .from(lootSubmissionTable)
          .innerJoin(
            organizationLootRecordTable,
            eq(
              organizationLootRecordTable.id,
              lootSubmissionTable.organizationLootRecordId,
            ),
          )
          .where(
            and(
              eq(organizationLootRecordTable.lootId, lootId),
              inArray(organizationLootRecordTable.guildId, guildIds),
            ),
          ),
      },
      { concurrency: "unbounded" },
    ).pipe(
      Effect.map(({ records, submissions }) => {
        const submissionsByRecordId = new Map<
          number,
          Array<{ memberId: number }>
        >();

        for (const submission of submissions) {
          const recordSubmissions =
            submissionsByRecordId.get(submission.organizationLootRecordId) ??
            [];

          recordSubmissions.push({ memberId: submission.memberId });
          submissionsByRecordId.set(
            submission.organizationLootRecordId,
            recordSubmissions,
          );
        }

        return records.map((record) => ({
          guildId: record.guildId,
          archivedAt: record.archivedAt,
          submissions: submissionsByRecordId.get(record.id) ?? [],
        }));
      }),
    );
  },

  appendSubmissions: (
    lootId,
    submissions,
    publications,
    mapPlayersSnapshot,
  ) => {
    const guildIds = [
      ...new Set(submissions.map(({ guildId }) => guildId)),
    ].sort();

    return database.transaction((transaction) =>
      Effect.gen(function* () {
        const now = new Date(yield* Clock.currentTimeMillis);

        if (guildIds.length > 0) {
          yield* transaction
            .insert(organizationLootRecordTable)
            .values(
              guildIds.map((guildId) => ({
                guildId,
                lootId,
                updatedAt: now,
              })),
            )
            .onConflictDoNothing({
              target: [
                organizationLootRecordTable.guildId,
                organizationLootRecordTable.lootId,
              ],
            });
        }

        const records =
          guildIds.length === 0
            ? []
            : yield* transaction
                .select({
                  id: organizationLootRecordTable.id,
                  guildId: organizationLootRecordTable.guildId,
                  archivedAt: organizationLootRecordTable.archivedAt,
                })
                .from(organizationLootRecordTable)
                .where(
                  and(
                    eq(organizationLootRecordTable.lootId, lootId),
                    inArray(organizationLootRecordTable.guildId, guildIds),
                  ),
                );

        const snapshotGuildIds = mapPlayersSnapshot
          ? yield* captureLootMapPlayers(
              transaction,
              lootId,
              mapPlayersSnapshot.guildIds,
              mapPlayersSnapshot.players,
              now,
            )
          : [];

        const rows = toLootSubmissionRows(records, submissions, now);

        if (rows.length > 0) {
          yield* transaction
            .insert(lootSubmissionTable)
            .values(rows)
            .onConflictDoNothing({
              target: [
                lootSubmissionTable.organizationLootRecordId,
                lootSubmissionTable.memberId,
              ],
            });
        }

        const acceptedNpcs = yield* transaction
          .select({ npc: npcSnapshotTable })
          .from(lootNpcTable)
          .innerJoin(
            npcSnapshotTable,
            eq(npcSnapshotTable.id, lootNpcTable.npcSnapshotId),
          )
          .where(eq(lootNpcTable.lootId, lootId))
          .orderBy(lootNpcTable.id);

        const intents = publications(
          [
            ...new Set([
              ...records
                .filter((record) => record.archivedAt === null)
                .map((record) => record.guildId),
              ...snapshotGuildIds,
            ]),
          ],
          acceptedNpcs.map(({ npc }) => npc),
        );

        if (intents.length > 0) {
          yield* transaction
            .insert(lootPublicationOutboxTable)
            .values(intents.map((intent) => ({ ...intent, lootId })));
        }

        return records;
      }),
    );
  },

  createNewLoot: (data, publications) =>
    database.transaction((transaction) =>
      Effect.gen(function* () {
        const now = new Date(yield* Clock.currentTimeMillis);

        const createdLoots = yield* transaction
          .insert(lootTable)
          .values({
            uniqueId: data.uniqueId,
            world: data.world,
            gameVersion: data.gameVersion,
            source: data.source,
            location: data.location,
            lootShare: data.lootShare,
            lootShareSource: data.lootShareSource,
            updatedAt: now,
          })
          .returning({ id: lootTable.id });

        const loot = createdLoots[0];

        if (!loot) {
          return yield* Effect.fail(
            new DependencyUnavailableError("Failed to create loot"),
          );
        }

        // Snapshot tables are resolved in one order (items, players, NPCs) so
        // overlapping concurrent loots cannot wait on each other's keys in reverse.
        const itemSnapshotIds = yield* resolveItemSnapshotIds(
          transaction,
          data.items.map((item) => omit(item, ["hid", "instanceStat"])),
        );

        if (itemSnapshotIds.length > 0) {
          yield* transaction.insert(lootItemTable).values(
            zip(data.items, itemSnapshotIds).map(([item, itemSnapshotId]) => ({
              lootId: loot.id,
              itemSnapshotId,
              hid: item.hid,
              instanceStat: item.instanceStat,
            })),
          );
        }

        // Resolve all characters in one sorted batch; overlapping participant/map
        // batches from concurrent loots must acquire snapshot keys in the same order.
        const resolvedSnapshots = yield* resolvePlayerSnapshots(transaction, [
          ...data.players,
          ...mapPlayersToSnapshotInputs(
            data.world,
            data.mapPlayersSnapshot ?? [],
          ),
        ]);

        const playerSnapshots = resolvedSnapshots.slice(0, data.players.length);

        if (playerSnapshots.length > 0) {
          yield* transaction.insert(lootPlayerTable).values(
            playerSnapshots.map((snapshot, index) => ({
              lootId: loot.id,
              playerSnapshotId: snapshot.id,
              lvl: data.players[index]?.lvl,
            })),
          );
        }

        const acceptedNpcs = yield* resolveNpcSnapshots(
          transaction,
          data.gameVersion,
          data.npcs.map((npc) => omit(npc, ["runtimeNpcId"])),
        );

        if (acceptedNpcs.length > 0) {
          yield* transaction.insert(lootNpcTable).values(
            zip(acceptedNpcs, data.npcs).map(([snapshot, npc]) => ({
              lootId: loot.id,
              npcSnapshotId: snapshot.id,
              runtimeNpcId: npc.runtimeNpcId,
            })),
          );
        }

        const records = yield* transaction
          .insert(organizationLootRecordTable)
          .values(
            data.submissions.map(({ guildId }) => ({
              guildId,
              lootId: loot.id,
              updatedAt: now,
            })),
          )
          .returning({
            id: organizationLootRecordTable.id,
            guildId: organizationLootRecordTable.guildId,
          });

        if (data.mapPlayersSnapshot) {
          yield* captureLootMapPlayers(
            transaction,
            loot.id,
            records.map(({ guildId }) => guildId),
            data.mapPlayersSnapshot,
            now,
          );
        }

        yield* transaction
          .insert(lootSubmissionTable)
          .values(toLootSubmissionRows(records, data.submissions, now));
        const intents = publications(loot.id, acceptedNpcs);

        if (intents.length > 0) {
          yield* transaction
            .insert(lootPublicationOutboxTable)
            .values(intents.map((intent) => ({ ...intent, lootId: loot.id })));
        }

        return loot.id;
      }),
    ),
});
