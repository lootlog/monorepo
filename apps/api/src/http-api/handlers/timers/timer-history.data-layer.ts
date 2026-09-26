import { and, desc, eq, getTableColumns, inArray, lte, sql } from "drizzle-orm";
import { Capability } from "@lootlog/domain/access-policy";
import { Effect } from "effect";
import { canViewTimer } from "./timer-selection.js";
import {
  getTimerRestoreSnapshot,
  getTimerResetRollbackSnapshot,
} from "./timer-restore-snapshot.js";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  TimerHistoryAction,
  type TimerHistoryEntry,
} from "#src/timers/timers.types";
import {
  guildTable,
  memberTable,
  playerSnapshotTable,
  timerHistoryEntryTable,
  timerTable,
} from "#src/database/drizzle/schema";
import { ErrorKey } from "#src/timers/error-key";
import { isLegacyNpcIdIdentifier } from "#src/timers/timer-key";
import { InvalidRequestError } from "#src/shared/http/http-errors";
import type { TimersGuildAccess } from "./timers.handlers.js";
import { toTimersDataFailure } from "./timer-errors.js";
import {
  mapTimerCharacter,
  mapTimerMember,
  mapTimerNpc,
} from "#src/timers/timer-projection";

type TimerHistoryAssociations = {
  actorCharacter?: NonNullable<ReturnType<typeof mapTimerCharacter>>;
};

export const makeTimerHistory = (database: typeof ApiDatabase.Service) => {
  const read = (
    access: TimersGuildAccess,
    world: string,
    timerIdentifier: string | null,
    requestedLimit?: number,
  ) =>
    Effect.gen(function* () {
      const limit =
        requestedLimit && requestedLimit > 0 ? Math.min(requestedLimit, 20) : 5;

      let timerKey = timerIdentifier;

      if (timerIdentifier && isLegacyNpcIdIdentifier(timerIdentifier)) {
        const matches = yield* database
          .select({ timerKey: timerTable.timerKey })
          .from(timerTable)
          .where(
            and(
              eq(timerTable.guildId, access.guild.id),
              eq(timerTable.world, world),
              eq(timerTable.npcId, Number.parseInt(timerIdentifier, 10)),
            ),
          );

        if (matches.length > 1) {
          return yield* Effect.fail(
            new InvalidRequestError({
              message: ErrorKey.AMBIGUOUS_TIMER_IDENTIFIER,
            }),
          );
        }

        timerKey = matches[0]?.timerKey ?? timerIdentifier;
      }

      const condition = timerKey
        ? and(
            eq(timerHistoryEntryTable.guildId, access.guild.id),
            eq(timerHistoryEntryTable.world, world),
            eq(timerHistoryEntryTable.timerKey, timerKey),
          )
        : and(
            eq(timerHistoryEntryTable.guildId, access.guild.id),
            eq(timerHistoryEntryTable.world, world),
          );

      const rows = yield* database
        .select({
          entry: timerHistoryEntryTable,
          guildName: guildTable.name,
          actorMember: memberTable,
          actorCharacter: playerSnapshotTable,
          currentTimer: timerTable,
        })
        .from(timerHistoryEntryTable)
        .innerJoin(
          guildTable,
          eq(guildTable.id, timerHistoryEntryTable.guildId),
        )
        .innerJoin(
          memberTable,
          eq(memberTable.id, timerHistoryEntryTable.actorMemberId),
        )
        .leftJoin(
          playerSnapshotTable,
          eq(
            playerSnapshotTable.id,
            timerHistoryEntryTable.actorCharacterSnapshotId,
          ),
        )
        .leftJoin(
          timerTable,
          and(
            eq(timerTable.guildId, timerHistoryEntryTable.guildId),
            eq(timerTable.world, timerHistoryEntryTable.world),
            eq(timerTable.timerKey, timerHistoryEntryTable.timerKey),
          ),
        )
        .where(condition)
        .orderBy(
          ...(timerKey
            ? [desc(timerHistoryEntryTable.id)]
            : [
                desc(timerHistoryEntryTable.createdAt),
                desc(timerHistoryEntryTable.id),
              ]),
        )
        .limit(limit);

      const canWrite = access.accessPolicy.allows(
        Capability.LOOTLOG_TIMERS_WRITE,
      );

      const rollbackTimerKeys = canWrite
        ? [
            ...new Set(
              rows
                .filter(
                  ({ entry }) =>
                    entry.action === TimerHistoryAction.RESET &&
                    canViewTimer(access, entry),
                )
                .map(({ entry }) => entry.timerKey),
            ),
          ]
        : [];

      const rollbackHistory = new Map<
        string,
        {
          latest?: TimerHistoryEntry;
          previous?: TimerHistoryEntry;
        }
      >();

      if (rollbackTimerKeys.length > 0) {
        const rankedHistory = database.$with("timer_rollback_history").as(
          database
            .select({
              ...getTableColumns(timerHistoryEntryTable),
              position: sql<number>`row_number() over (
              partition by ${timerHistoryEntryTable.timerKey}
              order by ${timerHistoryEntryTable.id} desc
            )`
                .mapWith(Number)
                .as("position"),
            })
            .from(timerHistoryEntryTable)
            .where(
              and(
                eq(timerHistoryEntryTable.guildId, access.guild.id),
                eq(timerHistoryEntryTable.world, world),
                inArray(timerHistoryEntryTable.timerKey, rollbackTimerKeys),
              ),
            ),
        );

        const snapshots = yield* database
          .with(rankedHistory)
          .select()
          .from(rankedHistory)
          .where(lte(rankedHistory.position, 2));

        for (const snapshot of snapshots) {
          const history = rollbackHistory.get(snapshot.timerKey) ?? {};

          if (snapshot.position === 1) history.latest = snapshot;
          else history.previous = snapshot;
          rollbackHistory.set(snapshot.timerKey, history);
        }
      }

      return rows.flatMap(
        ({ entry, guildName, actorMember, actorCharacter, currentTimer }) => {
          if (!canViewTimer(access, entry)) {
            return [];
          }

          const character = mapTimerCharacter(
            actorCharacter,
            entry.actorCharacterLvl,
          );

          const associations: TimerHistoryAssociations = {};

          if (character !== undefined) associations.actorCharacter = character;

          const rollback = rollbackHistory.get(entry.timerKey);

          const canUndoReset =
            currentTimer !== null &&
            canViewTimer(access, currentTimer) &&
            rollback?.previous !== undefined &&
            canViewTimer(access, rollback.previous) &&
            getTimerResetRollbackSnapshot(
              entry,
              currentTimer,
              rollback.latest,
              rollback.previous,
            ) !== undefined;

          const canRestoreDeleted =
            getTimerRestoreSnapshot(entry) !== undefined &&
            (currentTimer === null ||
              (currentTimer.deletedAt !== null &&
                canViewTimer(access, currentTimer)));

          return [
            {
              ...associations,
              id: entry.id,
              guildId: entry.guildId,
              guildName,
              world: entry.world,
              timerKey: entry.timerKey,
              npcId: entry.npcId,
              npc: mapTimerNpc(entry.npc),
              action: entry.action,
              member: mapTimerMember(actorMember),
              minSpawnTime: entry.minSpawnTime,
              maxSpawnTime: entry.maxSpawnTime,
              canRestore: canWrite && (canRestoreDeleted || canUndoReset),
              createdAt: entry.createdAt,
            },
          ];
        },
      );
    }).pipe(Effect.mapError(toTimersDataFailure));

  return {
    getHistory: (
      access: TimersGuildAccess,
      world: string,
      timerIdentifier: string,
      limit?: number,
    ) => read(access, world, timerIdentifier, limit),
    getRecentHistory: (
      access: TimersGuildAccess,
      world: string,
      limit?: number,
    ) => read(access, world, null, limit),
  };
};
