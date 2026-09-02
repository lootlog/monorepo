import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { and, eq, inArray } from "drizzle-orm";
import { Effect } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";
import { DrizzleDatabaseRuntime } from "#src/database/drizzle/runtime";
import {
  itemSnapshotTable,
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
import type { ItemRarityEnum as ItemRarity } from "@lootlog/schema/item-rarity";
import type {
  LootShareSourceEnum as LootShareSource,
  LootSourceEnum as LootSource,
  ProfessionEnum as Profession,
} from "@lootlog/schema/loot";
import type { NpcTypeEnum as NpcType } from "@lootlog/schema/npc-type";

export type PersistedLootSubmission = {
  guildId: string;
  memberId: number;
};

export type NewLootPersistence = {
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
    snapshotHash: string;
    name: string;
    prof: Profession;
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

@Injectable()
export class LootSubmissionAcceptanceRepository {
  constructor(private readonly databaseRuntime: DrizzleDatabaseRuntime) {}

  async findLootIdByUniqueId(uniqueId: string): Promise<number | null> {
    const rows = await this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .select({ id: lootTable.id })
          .from(lootTable)
          .where(eq(lootTable.uniqueId, uniqueId))
          .limit(1),
      ),
    );
    return rows[0]?.id ?? null;
  }

  findMembers(discordId: string, guildIds: string[]) {
    if (guildIds.length === 0) return Promise.resolve([]);
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .select({ id: memberTable.id, guildId: memberTable.guildId })
          .from(memberTable)
          .where(
            and(
              inArray(memberTable.guildId, guildIds),
              eq(memberTable.userId, discordId),
            ),
          ),
      ),
    );
  }

  async findExistingRecords(lootId: number, guildIds: string[]) {
    if (guildIds.length === 0) return [];
    const [records, submissions] = await Promise.all([
      this.databaseRuntime.runPromise(
        Effect.flatMap(ApiDatabase, (database) =>
          database
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
        ),
      ),
      this.databaseRuntime.runPromise(
        Effect.flatMap(ApiDatabase, (database) =>
          database
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
        ),
      ),
    ]);
    const submissionsByRecordId = new Map<
      number,
      Array<{ memberId: number }>
    >();
    for (const submission of submissions) {
      const recordSubmissions =
        submissionsByRecordId.get(submission.organizationLootRecordId) ?? [];
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
  }

  appendSubmissions(lootId: number, submissions: PersistedLootSubmission[]) {
    const guildIds = [...new Set(submissions.map(({ guildId }) => guildId))];
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database.transaction((transaction) =>
          Effect.gen(function* () {
            const now = new Date();
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
            const recordIdByGuildId = new Map(
              records.map((record) => [record.guildId, record.id]),
            );
            const rows = submissions.map((submission) => {
              const organizationLootRecordId = recordIdByGuildId.get(
                submission.guildId,
              );
              if (organizationLootRecordId === undefined) {
                throw new ServiceUnavailableException(
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
            return records;
          }),
        ),
      ),
    );
  }

  createNewLoot(data: NewLootPersistence): Promise<number> {
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database.transaction((transaction) =>
          Effect.gen(function* () {
            const now = new Date();
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
              throw new ServiceUnavailableException("Failed to create loot");
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
                  target: [
                    itemSnapshotTable.itemId,
                    itemSnapshotTable.statsHash,
                  ],
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
                throw new ServiceUnavailableException(
                  "Failed to resolve item snapshot",
                );
              }
              yield* transaction.insert(lootItemTable).values({
                lootId: loot.id,
                itemSnapshotId: snapshot.id,
                hid: item.hid,
              });
            }

            for (const player of data.players) {
              const inserted = yield* transaction
                .insert(playerSnapshotTable)
                .values({
                  world: player.world,
                  accountId: player.accountId,
                  characterId: player.characterId,
                  snapshotHash: player.snapshotHash,
                  name: player.name,
                  prof: player.prof,
                  icon: player.icon,
                })
                .onConflictDoNothing({
                  target: [
                    playerSnapshotTable.world,
                    playerSnapshotTable.accountId,
                    playerSnapshotTable.characterId,
                    playerSnapshotTable.snapshotHash,
                  ],
                })
                .returning({ id: playerSnapshotTable.id });
              const existing = inserted[0]
                ? inserted
                : yield* transaction
                    .select({ id: playerSnapshotTable.id })
                    .from(playerSnapshotTable)
                    .where(
                      and(
                        eq(playerSnapshotTable.world, player.world),
                        eq(playerSnapshotTable.accountId, player.accountId),
                        eq(playerSnapshotTable.characterId, player.characterId),
                        eq(
                          playerSnapshotTable.snapshotHash,
                          player.snapshotHash,
                        ),
                      ),
                    )
                    .limit(1);
              const snapshot = existing[0];
              if (!snapshot) {
                throw new ServiceUnavailableException(
                  "Failed to resolve player snapshot",
                );
              }
              yield* transaction.insert(lootPlayerTable).values({
                lootId: loot.id,
                playerSnapshotId: snapshot.id,
                lvl: player.lvl,
              });
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
                throw new ServiceUnavailableException(
                  "Failed to resolve NPC snapshot",
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
            const recordIdByGuildId = new Map(
              records.map((record) => [record.guildId, record.id]),
            );
            yield* transaction.insert(lootSubmissionTable).values(
              data.submissions.map((submission) => {
                const organizationLootRecordId = recordIdByGuildId.get(
                  submission.guildId,
                );
                if (organizationLootRecordId === undefined) {
                  throw new ServiceUnavailableException(
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
            return loot.id;
          }),
        ),
      ),
    );
  }
}
