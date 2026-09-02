import { and, asc, eq, gte, isNull, ne, sql } from "drizzle-orm";
import { Effect, Schema } from "effect";
import { LootShareSourceEnum as LootShareSource } from "@lootlog/schema/loot";
import { ApiDatabase } from "#src/database/drizzle/database";
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
import type { LootShare } from "#src/shared/dto/loot-response.dto";

type AuthorizedLootOptions = {
  readonly actorUserId: string;
  readonly lootId: number;
  readonly submissionCutoff: Date;
};

const databaseSubmissionCutoff = (cutoff: Date) =>
  sql`CURRENT_TIMESTAMP - ${Date.now() - cutoff.getTime()} * INTERVAL '1 millisecond'`;
const authorizedSubmissionExists = (options: AuthorizedLootOptions) =>
  sql`EXISTS (
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

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class LootAllocationPersistenceError extends Schema.TaggedError<LootAllocationPersistenceError>()(
  "LootAllocationPersistenceError",
  { operation: Schema.String, cause: Schema.Defect() },
) {}

export const makeLootAllocationPersistence = (
  database: typeof ApiDatabase.Service,
) => {
  const protect = <A, E>(operation: string, effect: Effect.Effect<A, E>) =>
    effect.pipe(
      Effect.mapError(
        (cause) => new LootAllocationPersistenceError({ operation, cause }),
      ),
      Effect.withSpan(operation, {
        attributes: { adapter: "loot-allocation.drizzle", retryCount: 0 },
      }),
    );

  const findAuthorizedLoot = (options: AuthorizedLootOptions) =>
    protect(
      "loot-allocation.find-authorized",
      Effect.gen(function* () {
        const [loot] = yield* database
          .select()
          .from(lootTable)
          .where(
            and(
              eq(lootTable.id, options.lootId),
              authorizedSubmissionExists(options),
            ),
          )
          .limit(1);
        if (!loot) return null;
        const [items, players, npcs, records] = yield* Effect.all(
          [
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
            database
              .select({ lootNpc: lootNpcTable, npcSnapshot: npcSnapshotTable })
              .from(lootNpcTable)
              .innerJoin(
                npcSnapshotTable,
                eq(npcSnapshotTable.id, lootNpcTable.npcSnapshotId),
              )
              .where(eq(lootNpcTable.lootId, loot.id))
              .orderBy(asc(lootNpcTable.id)),
            database
              .select({ guildId: organizationLootRecordTable.guildId })
              .from(organizationLootRecordTable)
              .where(
                and(
                  eq(organizationLootRecordTable.lootId, loot.id),
                  isNull(organizationLootRecordTable.archivedAt),
                ),
              ),
          ] as const,
          { concurrency: "unbounded" },
        );
        return {
          ...loot,
          lootItems: items.map(({ lootItem, itemSnapshot }) => ({
            ...lootItem,
            itemSnapshot,
          })),
          lootPlayers: players.map(({ lootPlayer, playerSnapshot }) => ({
            ...lootPlayer,
            playerSnapshot,
          })),
          lootNpcs: npcs.map(({ lootNpc, npcSnapshot }) => ({
            ...lootNpc,
            npcSnapshot,
          })),
          organizationLootRecords: records,
        };
      }),
    );

  const compareAndSetChatAllocation = (
    options: AuthorizedLootOptions & { readonly lootShare: LootShare },
  ) =>
    protect(
      "loot-allocation.compare-and-set",
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
        .returning({ id: lootTable.id })
        .pipe(Effect.map((rows) => rows.length > 0)),
    );

  const findAuthorizedAllocationState = (options: AuthorizedLootOptions) =>
    protect(
      "loot-allocation.find-state",
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
        .limit(1)
        .pipe(Effect.map((rows) => rows[0] ?? null)),
    );

  return {
    findAuthorizedLoot,
    compareAndSetChatAllocation,
    findAuthorizedAllocationState,
  } as const;
};

export type LootAllocationPersistence = ReturnType<
  typeof makeLootAllocationPersistence
>;
