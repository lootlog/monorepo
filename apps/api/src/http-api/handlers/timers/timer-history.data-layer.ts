import {
  and,
  desc,
  eq,
  getTableColumns,
  inArray,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { Capability } from "@lootlog/domain/access-policy";
import { Clock, Effect } from "effect";
import { uniqBy } from "es-toolkit";
import { activeTimerEventCondition, canViewTimer } from "./timer-selection.js";
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
  eventHeroNpcTable,
  eventTable,
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
  timerNpcField,
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

      const recentEntryIds = database
        .select({ id: timerHistoryEntryTable.id })
        .from(timerHistoryEntryTable)
        .where(condition)
        // Preserve insertion order without scanning unrelated Organizations through the primary key.
        .orderBy(desc(sql`${timerHistoryEntryTable.id}::bigint`))
        .limit(limit);

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
        .where(
          timerKey
            ? condition
            : inArray(timerHistoryEntryTable.id, recentEntryIds),
        )
        .orderBy(desc(timerHistoryEntryTable.id))
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

      const eventTargets = canWrite
        ? uniqBy(
            rows.flatMap(({ entry, currentTimer }) => {
              if (
                !canViewTimer(access, entry) ||
                (entry.action !== TimerHistoryAction.DELETE &&
                  entry.action !== TimerHistoryAction.RESET)
              )
                return [];

              const previous = rollbackHistory.get(entry.timerKey)?.previous;

              return [
                entry,
                ...(currentTimer ? [currentTimer] : []),
                ...(previous ? [previous] : []),
              ];
            }),
            (target) =>
              `${target.npcId}:${String(timerNpcField(target.npc, "name") ?? "")}`,
          )
        : [];

      const now = new Date(yield* Clock.currentTimeMillis);

      const eventHeroes =
        eventTargets.length > 0
          ? yield* database
              .select({
                npcId: eventHeroNpcTable.npcId,
                npcName: eventHeroNpcTable.npcName,
              })
              .from(eventHeroNpcTable)
              .innerJoin(
                eventTable,
                eq(eventTable.id, eventHeroNpcTable.eventId),
              )
              .where(
                or(
                  ...eventTargets.map((target) =>
                    activeTimerEventCondition(
                      access.guild.id,
                      world,
                      target.npcId,
                      String(timerNpcField(target.npc, "name") ?? ""),
                      now,
                    ),
                  ),
                ),
              )
          : [];

      const eventNpcIds = new Set(eventHeroes.map((hero) => hero.npcId));
      const eventNpcNames = new Set(eventHeroes.map((hero) => hero.npcName));

      const isEventTimer = (
        timer: Pick<typeof timerTable.$inferSelect, "npcId" | "npc">,
      ) =>
        eventNpcIds.has(timer.npcId) ||
        eventNpcNames.has(String(timerNpcField(timer.npc, "name") ?? ""));

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
            !isEventTimer(currentTimer) &&
            rollback?.previous !== undefined &&
            canViewTimer(access, rollback.previous) &&
            !isEventTimer(rollback.previous) &&
            getTimerResetRollbackSnapshot(
              entry,
              currentTimer,
              rollback.latest,
              rollback.previous,
            ) !== undefined;

          const canRestoreDeleted =
            getTimerRestoreSnapshot(entry) !== undefined &&
            !isEventTimer(entry) &&
            (currentTimer === null ||
              (currentTimer.deletedAt !== null &&
                canViewTimer(access, currentTimer) &&
                !isEventTimer(currentTimer)));

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
