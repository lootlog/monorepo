import {
  captureLootMapPlayers,
  mapPlayersToSnapshotInputs,
} from "./loot-map-players.persistence.js";
import { resolvePlayerSnapshots } from "#src/shared/margonem/player-snapshot.persistence";
import type { MapPlayersSnapshot } from "#src/contracts/loots/map-players-snapshot";
import { activeGuildMemberJoin } from "#src/members/member-access-query";
import { DependencyUnavailableError } from "#src/shared/http/http-errors";
import {
  and,
  arrayOverlaps,
  desc,
  eq,
  inArray,
  isNull,
  ne,
  or,
} from "drizzle-orm";
import { Clock, Effect } from "effect";
import { lootPublicationOutboxTable } from "#src/database/drizzle/loot-publication-outbox.schema";
import type { LootPublication } from "./loot-publication-outbox.js";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  itemSnapshotTable,
  guildTable,
  lootItemTable,
  lootlogConfigNpcTable,
  lootlogConfigTable,
  lootNpcTable,
  lootPlayerTable,
  lootSubmissionTable,
  lootTable,
  memberTable,
  memberToRoleTable,
  npcSnapshotTable,
  organizationLootRecordTable,
  roleTable,
  userCharactersLootlogSettingsTable,
} from "#src/database/drizzle/schema";
import type { Permission } from "@lootlog/schema/permissions";
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

export type PersistedLootSubmission = {
  guildId: string;
  memberId: number;
};

export type NewLootPersistence = {
  mapPlayersSnapshot: MapPlayersSnapshot | null;
  uniqueId: string;
  world: string;
  source: LootSource;
  location: string;
  lootShare: Record<string, string[]>;
  lootShareSource: LootShareSource;
  items: Array<{
    itemId: number;
    statsHash: string;
    name: string;
    icon: string;
    lvl: number;
    rarity: ItemRarity;
    itemType: string;
    statRaw: string;
    statsSnapshot: Record<string, string>;
    hid: string;
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
    publications: (organizationIds: string[]) => LootPublication[],
    mapPlayersSnapshot?: { guildIds: string[]; players: MapPlayersSnapshot },
  ) => Effect.Effect<
    Array<{ id: number; guildId: string; archivedAt: Date | null }>,
    unknown
  >;
  readonly createNewLoot: (
    data: NewLootPersistence,
    publications: (lootId: number) => LootPublication[],
  ) => Effect.Effect<number, unknown>;
}

export const makeLootSubmissionAcceptancePersistence = (
  database: typeof ApiDatabase.Service,
): LootSubmissionAcceptancePersistence => ({
  findGuildsForPermissions: (discordId, permissions) =>
    database
      .selectDistinct({ guild: guildTable })
      .from(guildTable)
      .leftJoin(memberTable, activeGuildMemberJoin(discordId))
      .leftJoin(memberToRoleTable, eq(memberToRoleTable.A, memberTable.id))
      .leftJoin(roleTable, eq(memberToRoleTable.B, roleTable.id))
      .where(
        and(
          eq(guildTable.active, true),
          or(
            eq(guildTable.ownerId, discordId),
            arrayOverlaps(roleTable.permissions, permissions),
          ),
        ),
      )
      .pipe(Effect.map((rows) => rows.map(({ guild }) => guild))),

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
        const recordIdByGuildId = new Map(
          records.map((record) => [record.guildId, record.id]),
        );
        const rows = submissions.map((submission) => {
          const organizationLootRecordId = recordIdByGuildId.get(
            submission.guildId,
          );
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
        const intents = publications([
          ...new Set([
            ...records
              .filter((record) => record.archivedAt === null)
              .map((record) => record.guildId),
            ...snapshotGuildIds,
          ]),
        ]);
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

        for (const item of data.items) {
          const inserted = yield* transaction
            .insert(itemSnapshotTable)
            .values({
              itemId: item.itemId,
              statsHash: item.statsHash,
              name: item.name,
              icon: item.icon,
              lvl: item.lvl,
              rarity: item.rarity,
              itemType: item.itemType,
              statRaw: item.statRaw,
              statsSnapshot: item.statsSnapshot,
            })
            .onConflictDoNothing({
              target: [itemSnapshotTable.itemId, itemSnapshotTable.statsHash],
            })
            .returning({ id: itemSnapshotTable.id });
          const existing = inserted[0]
            ? inserted
            : yield* transaction
                .select({ id: itemSnapshotTable.id })
                .from(itemSnapshotTable)
                .where(
                  and(
                    eq(itemSnapshotTable.itemId, item.itemId),
                    eq(itemSnapshotTable.statsHash, item.statsHash),
                  ),
                )
                .limit(1);
          const snapshot = existing[0];
          if (!snapshot) {
            return yield* Effect.fail(
              new DependencyUnavailableError("Failed to resolve item snapshot"),
            );
          }
          yield* transaction.insert(lootItemTable).values({
            lootId: loot.id,
            itemSnapshotId: snapshot.id,
            hid: item.hid,
          });
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

        for (const npc of data.npcs) {
          const inserted = yield* transaction
            .insert(npcSnapshotTable)
            .values(npc)
            .onConflictDoNothing({
              target: [npcSnapshotTable.npcId, npcSnapshotTable.name],
            })
            .returning({ id: npcSnapshotTable.id });
          const existing = inserted[0]
            ? inserted
            : yield* transaction
                .select({ id: npcSnapshotTable.id })
                .from(npcSnapshotTable)
                .where(
                  and(
                    eq(npcSnapshotTable.npcId, npc.npcId),
                    eq(npcSnapshotTable.name, npc.name),
                  ),
                )
                .limit(1);
          const snapshot = existing[0];
          if (!snapshot) {
            return yield* Effect.fail(
              new DependencyUnavailableError("Failed to resolve NPC snapshot"),
            );
          }
          yield* transaction.insert(lootNpcTable).values({
            lootId: loot.id,
            npcSnapshotId: snapshot.id,
          });
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
        const recordIdByGuildId = new Map(
          records.map((record) => [record.guildId, record.id]),
        );
        yield* transaction.insert(lootSubmissionTable).values(
          data.submissions.map((submission) => {
            const organizationLootRecordId = recordIdByGuildId.get(
              submission.guildId,
            );
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
          }),
        );
        const intents = publications(loot.id);
        if (intents.length > 0) {
          yield* transaction
            .insert(lootPublicationOutboxTable)
            .values(intents.map((intent) => ({ ...intent, lootId: loot.id })));
        }
        return loot.id;
      }),
    ),
});
