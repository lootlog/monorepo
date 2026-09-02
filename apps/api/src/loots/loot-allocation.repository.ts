import { and, asc, eq, gte, isNull, ne, or, sql } from "drizzle-orm";
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
import { LootShareSourceEnum as LootShareSource } from "@lootlog/schema/loot";
import { NpcTypeEnum as NpcType } from "@lootlog/schema/npc-type";
import type { LootShare } from "#src/shared/dto/loot-response.dto";

type AuthorizedLootOptions = {
  actorUserId: string;
  lootId: number;
  submissionCutoff: Date;
};

const databaseSubmissionCutoff = (cutoff: Date) =>
  sql`CURRENT_TIMESTAMP - ${Date.now() - cutoff.getTime()} * INTERVAL '1 millisecond'`;

const authorizedSubmissionExists = (
  options: AuthorizedLootOptions,
) => sql`EXISTS (
  SELECT 1
  FROM "OrganizationLootRecord" allocation_record
  INNER JOIN "LootSubmission" allocation_submission
    ON allocation_submission."organizationLootRecordId" = allocation_record.id
  INNER JOIN "Member" allocation_member
    ON allocation_member.id = allocation_submission."memberId"
  WHERE allocation_record."lootId" = ${lootTable.id}
    AND allocation_member."globalUserId" = ${options.actorUserId}
    AND allocation_submission."createdAt" >= ${databaseSubmissionCutoff(options.submissionCutoff)}
)`;

export class LootAllocationRepository {
  constructor(private readonly databaseRuntime: DrizzleDatabaseRuntime) {}

  async hasAmbiguousNpcVariant(name: string): Promise<boolean> {
    const rows = await this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .select({ id: npcSnapshotTable.id })
          .from(npcSnapshotTable)
          .where(
            and(
              eq(npcSnapshotTable.name, name),
              or(
                ne(npcSnapshotTable.type, NpcType.COLOSSUS),
                isNull(npcSnapshotTable.type),
              ),
            ),
          )
          .limit(1),
      ),
    );
    return rows.length > 0;
  }

  async findAuthorizedLoot(options: AuthorizedLootOptions) {
    const lootRows = await this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .select()
          .from(lootTable)
          .where(
            and(
              eq(lootTable.id, options.lootId),
              authorizedSubmissionExists(options),
            ),
          )
          .limit(1),
      ),
    );
    const loot = lootRows[0];
    if (!loot) return null;

    const [lootItems, lootPlayers, lootNpcs, organizationLootRecords] =
      await Promise.all([
        this.databaseRuntime.runPromise(
          Effect.flatMap(ApiDatabase, (database) =>
            database
              .select({
                lootItem: lootItemTable,
                itemSnapshot: itemSnapshotTable,
              })
              .from(lootItemTable)
              .innerJoin(
                itemSnapshotTable,
                eq(itemSnapshotTable.id, lootItemTable.itemSnapshotId),
              )
              .where(eq(lootItemTable.lootId, loot.id)),
          ),
        ),
        this.databaseRuntime.runPromise(
          Effect.flatMap(ApiDatabase, (database) =>
            database
              .select({
                lootPlayer: lootPlayerTable,
                playerSnapshot: playerSnapshotTable,
              })
              .from(lootPlayerTable)
              .innerJoin(
                playerSnapshotTable,
                eq(playerSnapshotTable.id, lootPlayerTable.playerSnapshotId),
              )
              .where(eq(lootPlayerTable.lootId, loot.id)),
          ),
        ),
        this.databaseRuntime.runPromise(
          Effect.flatMap(ApiDatabase, (database) =>
            database
              .select({ lootNpc: lootNpcTable, npcSnapshot: npcSnapshotTable })
              .from(lootNpcTable)
              .innerJoin(
                npcSnapshotTable,
                eq(npcSnapshotTable.id, lootNpcTable.npcSnapshotId),
              )
              .where(eq(lootNpcTable.lootId, loot.id))
              .orderBy(asc(lootNpcTable.id)),
          ),
        ),
        this.databaseRuntime.runPromise(
          Effect.flatMap(ApiDatabase, (database) =>
            database
              .select({ guildId: organizationLootRecordTable.guildId })
              .from(organizationLootRecordTable)
              .where(
                and(
                  eq(organizationLootRecordTable.lootId, loot.id),
                  isNull(organizationLootRecordTable.archivedAt),
                ),
              ),
          ),
        ),
      ]);

    return {
      ...loot,
      lootItems: lootItems.map(({ lootItem, itemSnapshot }) => ({
        ...lootItem,
        itemSnapshot,
      })),
      lootPlayers: lootPlayers.map(({ lootPlayer, playerSnapshot }) => ({
        ...lootPlayer,
        playerSnapshot,
      })),
      lootNpcs: lootNpcs.map(({ lootNpc, npcSnapshot }) => ({
        ...lootNpc,
        npcSnapshot,
      })),
      organizationLootRecords,
    };
  }

  async compareAndSetChatAllocation(
    options: AuthorizedLootOptions & { lootShare: LootShare },
  ): Promise<boolean> {
    const updated = await this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .update(lootTable)
          .set({
            lootShare: options.lootShare,
            lootShareSource: LootShareSource.CHAT_MESSAGE,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(lootTable.id, options.lootId),
              ne(lootTable.lootShareSource, LootShareSource.CHAT_MESSAGE),
              authorizedSubmissionExists(options),
            ),
          )
          .returning({ id: lootTable.id }),
      ),
    );
    return updated.length > 0;
  }

  async findAuthorizedAllocationState(options: AuthorizedLootOptions) {
    const rows = await this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .select({
            lootShare: lootTable.lootShare,
            lootShareSource: lootTable.lootShareSource,
          })
          .from(lootTable)
          .innerJoin(
            organizationLootRecordTable,
            eq(organizationLootRecordTable.lootId, lootTable.id),
          )
          .innerJoin(
            lootSubmissionTable,
            eq(
              lootSubmissionTable.organizationLootRecordId,
              organizationLootRecordTable.id,
            ),
          )
          .innerJoin(
            memberTable,
            eq(memberTable.id, lootSubmissionTable.memberId),
          )
          .where(
            and(
              eq(lootTable.id, options.lootId),
              eq(memberTable.globalUserId, options.actorUserId),
              gte(
                lootSubmissionTable.createdAt,
                databaseSubmissionCutoff(options.submissionCutoff),
              ),
            ),
          )
          .limit(1),
      ),
    );
    return rows[0] ?? null;
  }
}
