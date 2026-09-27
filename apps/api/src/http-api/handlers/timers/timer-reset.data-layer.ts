import { pruneTimerHistory } from "./timer-history-retention.js";
import {
  canViewTimer,
  findTimerMatches,
  findActiveTimerEventHeroes,
} from "./timer-selection.js";
import { upsertActorCharacter } from "./timer-actor-snapshot.js";

import { and, eq } from "drizzle-orm";
import { Clock, Effect } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  memberTable,
  timerHistoryEntryTable,
  timerTable,
} from "#src/database/drizzle/schema";

import {
  InvalidRequestError,
  ResourceNotFoundError,
} from "#src/shared/http/http-errors";
import { TIMER_TYPES } from "#src/timers/timer-limits";
import { ErrorKey } from "#src/timers/error-key";
import { TimerHistoryAction } from "#src/timers/timers.types";

import type { ResetTimerRequest } from "#src/contracts/timers/schemas";
import type { TimersGuildAccess } from "./timers.handlers.js";
import { TimersMemberNotFound, toTimersDataFailure } from "./timer-errors.js";
import {
  publishTimerUpdate,
  type TimerUpdatePorts,
} from "./timer-update-publication.js";
import { timerNpcField } from "#src/timers/timer-projection";

export interface ResetTimerPorts extends TimerUpdatePorts {
  readonly withLock: <A, E>(
    key: string,
    effect: Effect.Effect<A, E>,
  ) => Effect.Effect<A, E | unknown>;
}

export const makeResetTimer = (
  database: typeof ApiDatabase.Service,
  ports: ResetTimerPorts,
) => {
  const operation = Effect.fn("resetTimerData")(function* (
    access: TimersGuildAccess,
    timerIdentifier: string,
    payload: ResetTimerRequest,
  ) {
    const matches = yield* findTimerMatches(
      database,
      access.guild.id,
      payload.world,
      timerIdentifier,
    );

    if (matches.some((timer) => !canViewTimer(access, timer))) {
      return yield* Effect.fail(
        new ResourceNotFoundError({ message: ErrorKey.TIMER_NOT_FOUND }),
      );
    }

    if (matches.length > 1) {
      return yield* Effect.fail(
        new InvalidRequestError({
          message: ErrorKey.AMBIGUOUS_TIMER_IDENTIFIER,
        }),
      );
    }

    const resolved = matches[0];

    if (!resolved) {
      return yield* Effect.fail(
        new ResourceNotFoundError({ message: ErrorKey.TIMER_NOT_FOUND }),
      );
    }

    const now = new Date(yield* Clock.currentTimeMillis);

    const activeEventHero = yield* findActiveTimerEventHeroes(
      database,
      access.guild.id,
      payload.world,
      [resolved],
      now,
    );

    if (activeEventHero.length > 0) {
      return yield* Effect.fail(
        new InvalidRequestError({
          message: ErrorKey.EVENT_TIMER_CANNOT_BE_RESET,
        }),
      );
    }

    const projection = yield* ports.withLock(
      `timer:lock:${access.guild.id}:${payload.world}:${resolved.timerKey}`,
      database.transaction((transaction) =>
        Effect.gen(function* () {
          const currentRows = yield* transaction
            .select()
            .from(timerTable)
            .where(
              and(
                eq(timerTable.guildId, access.guild.id),
                eq(timerTable.world, payload.world),
                eq(timerTable.timerKey, resolved.timerKey),
              ),
            )
            .limit(1)
            .for("update");

          const current = currentRows[0];

          if (!current || !canViewTimer(access, current)) {
            return yield* Effect.fail(
              new ResourceNotFoundError({
                message: ErrorKey.TIMER_NOT_FOUND,
              }),
            );
          }

          const respawnMilliseconds = current.latestRespBaseSeconds * 1000;

          const variance = Math.round(
            respawnMilliseconds * (current.latestRespawnRandomness / 100),
          );

          const minSpawnTime = new Date(
            now.getTime() + respawnMilliseconds - variance,
          );

          const maxSpawnTime = new Date(
            now.getTime() + respawnMilliseconds + variance,
          );

          const members = yield* transaction
            .select()
            .from(memberTable)
            .where(
              and(
                eq(memberTable.userId, access.discordId),
                eq(memberTable.guildId, access.guild.id),
              ),
            )
            .limit(1);

          const member = members[0];

          if (!member)
            return yield* Effect.die(
              new TimersMemberNotFound({
                guildId: access.guild.id,
                discordId: access.discordId,
              }),
            );
          const actor = payload.actorCharacter;

          const actorCharacter = yield* upsertActorCharacter(
            transaction,
            payload.world,
            actor,
          );

          const updatedRows = yield* transaction
            .update(timerTable)
            .set({
              createdById: member.id,
              minSpawnTime,
              maxSpawnTime,
              wasReset: true,
              deletedAt: null,
              updatedAt: now,
              actorCharacterSnapshotId: actorCharacter?.id ?? null,
              actorCharacterLvl: actor?.lvl ?? null,
            })
            .where(
              and(
                eq(timerTable.guildId, access.guild.id),
                eq(timerTable.world, payload.world),
                eq(timerTable.timerKey, resolved.timerKey),
              ),
            )
            .returning();

          const updated = updatedRows[0];

          if (!updated) {
            return yield* Effect.fail(
              new ResourceNotFoundError({
                message: ErrorKey.TIMER_NOT_FOUND,
              }),
            );
          }

          const manual =
            Number(timerNpcField(updated.npc, "margonemType")) ===
            TIMER_TYPES.CUSTOM_MANUAL;

          if (!manual) {
            yield* transaction.insert(timerHistoryEntryTable).values({
              guildId: access.guild.id,
              world: payload.world,
              timerKey: updated.timerKey,
              npcId: updated.npcId,
              npc: updated.npc,
              action: TimerHistoryAction.RESET,
              actorMemberId: member.id,
              actorCharacterSnapshotId: actorCharacter?.id,
              actorCharacterLvl: actor?.lvl,
              minSpawnTime,
              maxSpawnTime,
              latestRespBaseSeconds: updated.latestRespBaseSeconds,
              latestRespawnRandomness: updated.latestRespawnRandomness,
              wasReset: updated.wasReset,
              windowOpenedAt: updated.windowOpenedAt,
              timerCreatedById: updated.createdById,
              timerActorCharacterSnapshotId: updated.actorCharacterSnapshotId,
              timerActorCharacterLvl: updated.actorCharacterLvl,
            });

            yield* pruneTimerHistory(
              transaction,
              access.guild.id,
              payload.world,
              updated.timerKey,
            );
          }

          return { ...updated, member, actorCharacter };
        }),
      ),
    );

    return yield* publishTimerUpdate(ports, access.guild.id, projection);
  });

  return (
    access: TimersGuildAccess,
    timerIdentifier: string,
    payload: ResetTimerRequest,
  ) =>
    operation(access, timerIdentifier, payload).pipe(
      Effect.mapError(toTimersDataFailure),
    );
};
