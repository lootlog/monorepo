import { pruneTimerHistory } from "./timer-history-retention.js";
import { canViewTimer, findActiveTimerEventHeroes } from "./timer-selection.js";
import {
  getTimerRestoreSnapshot,
  getTimerResetRollbackSnapshot,
  getTimerHistorySnapshot,
  isCurrentTimerReset,
} from "./timer-restore-snapshot.js";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { Clock, Effect } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  memberTable,
  playerSnapshotTable,
  timerHistoryEntryTable,
  timerTable,
} from "#src/database/drizzle/schema";
import {
  InvalidRequestError,
  ResourceConflictError,
  ResourceNotFoundError,
} from "#src/shared/http/http-errors";
import { ErrorKey } from "#src/timers/error-key";
import {
  TimerHistoryAction,
  type TimerHistoryEntry,
} from "#src/timers/timers.types";
import type { TimersGuildAccess } from "./timers.handlers.js";
import {
  TimersInvariantViolation,
  toTimersDataFailure,
} from "./timer-errors.js";
import {
  publishTimerUpdate,
  type TimerUpdatePorts,
} from "./timer-update-publication.js";

const resolveResetRollbackSnapshot = Effect.fnUntraced(function* (
  database: Pick<typeof ApiDatabase.Service, "select">,
  access: TimersGuildAccess,
  entry: TimerHistoryEntry,
  current: typeof timerTable.$inferSelect | undefined,
) {
  const [latest, previous] = yield* database
    .select()
    .from(timerHistoryEntryTable)
    .where(
      and(
        eq(timerHistoryEntryTable.guildId, access.guild.id),
        eq(timerHistoryEntryTable.world, entry.world),
        eq(timerHistoryEntryTable.timerKey, entry.timerKey),
      ),
    )
    .orderBy(desc(timerHistoryEntryTable.id))
    .limit(2);

  if (!isCurrentTimerReset(entry, current, latest)) {
    return yield* Effect.fail(
      new ResourceConflictError({ message: ErrorKey.EXISTING_TIMER }),
    );
  }

  if (previous && !canViewTimer(access, previous)) {
    return yield* Effect.fail(
      new ResourceNotFoundError({
        message: ErrorKey.TIMER_HISTORY_ENTRY_NOT_FOUND,
      }),
    );
  }

  return getTimerResetRollbackSnapshot(entry, current, latest, previous);
});

export const makeRestoreTimer = (
  database: typeof ApiDatabase.Service,
  ports: TimerUpdatePorts,
) => {
  const operation = Effect.fn("restoreTimerData")(function* (
    access: TimersGuildAccess,
    historyEntryId: number,
  ) {
    const projection = yield* database.transaction((transaction) =>
      Effect.gen(function* () {
        const historyRows = yield* transaction
          .select()
          .from(timerHistoryEntryTable)
          .where(
            and(
              eq(timerHistoryEntryTable.id, historyEntryId),
              eq(timerHistoryEntryTable.guildId, access.guild.id),
            ),
          )
          .limit(1);

        const entry = historyRows[0];

        if (!entry || !canViewTimer(access, entry)) {
          return yield* Effect.fail(
            new ResourceNotFoundError({
              message: ErrorKey.TIMER_HISTORY_ENTRY_NOT_FOUND,
            }),
          );
        }

        const rollbackReset = entry.action === TimerHistoryAction.RESET;
        let snapshot = getTimerRestoreSnapshot(entry);

        if (rollbackReset ? !getTimerHistorySnapshot(entry) : !snapshot) {
          return yield* Effect.fail(
            new InvalidRequestError({
              message: ErrorKey.TIMER_HISTORY_ENTRY_CANNOT_BE_RESTORED,
            }),
          );
        }

        const timerScope = and(
          eq(timerTable.guildId, access.guild.id),
          eq(timerTable.world, entry.world),
          eq(timerTable.timerKey, entry.timerKey),
        );

        const currentQuery = transaction
          .select()
          .from(timerTable)
          .where(timerScope)
          .limit(1);

        const existingRows = yield* rollbackReset
          ? currentQuery.for("update")
          : currentQuery;

        if (existingRows.some((timer) => !canViewTimer(access, timer))) {
          return yield* Effect.fail(
            new ResourceNotFoundError({
              message: ErrorKey.TIMER_HISTORY_ENTRY_NOT_FOUND,
            }),
          );
        }

        if (rollbackReset) {
          snapshot = yield* resolveResetRollbackSnapshot(
            transaction,
            access,
            entry,
            existingRows[0],
          );
        } else if (existingRows[0]?.deletedAt === null) {
          return yield* Effect.fail(
            new ResourceConflictError({ message: ErrorKey.EXISTING_TIMER }),
          );
        }

        if (!snapshot) {
          return yield* Effect.fail(
            new InvalidRequestError({
              message: ErrorKey.TIMER_HISTORY_ENTRY_CANNOT_BE_RESTORED,
            }),
          );
        }

        const now = new Date(yield* Clock.currentTimeMillis);

        const activeEventHeroes = yield* findActiveTimerEventHeroes(
          transaction,
          access.guild.id,
          entry.world,
          [snapshot, ...existingRows],
          now,
        );

        if (activeEventHeroes.length > 0) {
          return yield* Effect.fail(
            new InvalidRequestError({
              message: ErrorKey.EVENT_TIMER_CANNOT_BE_RESET,
            }),
          );
        }

        const restoredRows = yield* rollbackReset
          ? transaction
              .update(timerTable)
              .set({ ...snapshot, updatedAt: now })
              .where(timerScope)
              .returning()
          : transaction
              .insert(timerTable)
              .values({
                ...snapshot,
                guildId: access.guild.id,
                timerKey: entry.timerKey,
                world: entry.world,
                deletedAt: null,
                createdAt: now,
                updatedAt: now,
              })
              .onConflictDoUpdate({
                target: [
                  timerTable.guildId,
                  timerTable.world,
                  timerTable.timerKey,
                ],
                set: {
                  ...snapshot,
                  deletedAt: null,
                  updatedAt: now,
                },
                setWhere: isNotNull(timerTable.deletedAt),
              })
              .returning();

        const restored = restoredRows[0];

        if (!restored)
          return yield* Effect.fail(
            new ResourceConflictError({ message: ErrorKey.EXISTING_TIMER }),
          );

        const actors = yield* transaction
          .select()
          .from(memberTable)
          .where(
            and(
              eq(memberTable.userId, access.discordId),
              eq(memberTable.guildId, access.guild.id),
            ),
          )
          .limit(1);

        const actor = actors[0];

        if (!actor)
          return yield* Effect.die(
            new TimersInvariantViolation({ code: "HISTORY_ACTOR_NOT_FOUND" }),
          );
        yield* transaction.insert(timerHistoryEntryTable).values({
          guildId: access.guild.id,
          world: entry.world,
          timerKey: entry.timerKey,
          npcId: restored.npcId,
          npc: restored.npc,
          action: TimerHistoryAction.RESTORE,
          actorMemberId: actor.id,
          minSpawnTime: restored.minSpawnTime,
          maxSpawnTime: restored.maxSpawnTime,
          latestRespBaseSeconds: restored.latestRespBaseSeconds,
          latestRespawnRandomness: restored.latestRespawnRandomness,
          wasReset: restored.wasReset,
          windowOpenedAt: restored.windowOpenedAt,
          timerCreatedById: restored.createdById,
          timerActorCharacterSnapshotId: restored.actorCharacterSnapshotId,
          timerActorCharacterLvl: restored.actorCharacterLvl,
        });

        yield* pruneTimerHistory(
          transaction,
          access.guild.id,
          entry.world,
          entry.timerKey,
        );

        const creators = yield* transaction
          .select()
          .from(memberTable)
          .where(eq(memberTable.id, restored.createdById))
          .limit(1);

        const characters = restored.actorCharacterSnapshotId
          ? yield* transaction
              .select()
              .from(playerSnapshotTable)
              .where(
                eq(playerSnapshotTable.id, restored.actorCharacterSnapshotId),
              )
              .limit(1)
          : [];

        return {
          ...restored,
          member: creators[0] ?? null,
          actorCharacter: characters[0] ?? null,
        };
      }),
    );

    return yield* publishTimerUpdate(ports, access.guild.id, projection);
  });

  return (access: TimersGuildAccess, historyEntryId: number) =>
    operation(access, historyEntryId).pipe(
      Effect.mapError(toTimersDataFailure),
    );
};
