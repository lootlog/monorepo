import { getTimerHistoryValues } from "./timer-restore-snapshot.js";
import { pruneTimerHistory } from "./timer-history-retention.js";
import {
  timerNpcField,
  type TimerPublishedEvent,
} from "#src/timers/timer-projection";
import {
  canViewTimer,
  findTimerMatches,
  findActiveTimerEventHeroes,
  timerIdentifierCondition,
} from "./timer-selection.js";
import { findActiveGuildMember } from "#src/members/member-access-query";
import { Clock, Effect, Schema } from "effect";
import { getNpcRoutingTier } from "@lootlog/domain/npc-routing";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  timerHistoryEntryTable,
  timerTable,
} from "#src/database/drizzle/timer.schema";
import {
  InvalidRequestError,
  ResourceNotFoundError,
} from "#src/shared/http/http-errors";
import { ErrorKey } from "#src/timers/error-key";
import { TimerHistoryAction } from "#src/timers/timers.types";

import type { TimersGuildAccess } from "./timers.handlers.js";
import {
  TimersInvariantViolation,
  TimersNotFound,
  toTimersDataFailure,
} from "./timer-errors.js";

export interface DeleteTimerPorts {
  readonly invalidateList: (guildId: string) => Effect.Effect<unknown, unknown>;
  readonly publish: <
    Key extends
      | typeof RabbitRoutingKey.GUILDS_TIMERS_DELETE
      | typeof RabbitRoutingKey.NOTIFICATIONS_TIMER_DELETED,
  >(
    routingKey: Key,
    payload: TimerPublishedEvent<Key>,
  ) => Effect.Effect<unknown, unknown>;
}

export const makeDeleteTimer = (
  database: typeof ApiDatabase.Service,
  ports: DeleteTimerPorts,
) => {
  const operation = Effect.fn("deleteTimerData")(function* (
    access: TimersGuildAccess,
    timerIdentifier: string,
    world: string,
  ) {
    const resolved = yield* database.transaction((transaction) =>
      Effect.gen(function* () {
        const timerCondition = timerIdentifierCondition(
          access.guild.id,
          world,
          timerIdentifier,
        );

        const timers = yield* findTimerMatches(
          transaction,
          access.guild.id,
          world,
          timerIdentifier,
        ).for("update");

        if (timers.some((timer) => !canViewTimer(access, timer))) {
          return yield* Effect.fail(
            new ResourceNotFoundError({ code: ErrorKey.TIMER_NOT_FOUND }),
          );
        }

        if (timers.length > 1) {
          return yield* Effect.fail(
            new InvalidRequestError({
              code: ErrorKey.AMBIGUOUS_TIMER_IDENTIFIER,
            }),
          );
        }

        const timer = timers[0];

        if (!timer) {
          return yield* Effect.fail(
            new ResourceNotFoundError({
              code: ErrorKey.TIMER_NOT_FOUND,
            }),
          );
        }

        const now = new Date(yield* Clock.currentTimeMillis);

        const activeEventHero = yield* findActiveTimerEventHeroes(
          transaction,
          access.guild.id,
          world,
          [timer],
          now,
        );

        if (activeEventHero.length > 0) {
          return yield* Effect.fail(
            new InvalidRequestError({
              code: ErrorKey.EVENT_TIMER_MUST_USE_EVENT_CLOSE,
            }),
          );
        }

        const actor = yield* findActiveGuildMember(
          transaction,
          access.discordId,
          access.guild.id,
        );

        const actorMemberId = actor?.id;

        if (actorMemberId === undefined) {
          return yield* Effect.die(
            new TimersInvariantViolation({ code: "HISTORY_ACTOR_NOT_FOUND" }),
          );
        }

        yield* transaction.insert(timerHistoryEntryTable).values({
          ...getTimerHistoryValues(timer),
          guildId: access.guild.id,
          world,
          timerKey: timer.timerKey,
          action: TimerHistoryAction.DELETE,
          actorMemberId,
        });

        yield* pruneTimerHistory(
          transaction,
          access.guild.id,
          world,
          timer.timerKey,
        );

        const updated = yield* transaction
          .update(timerTable)
          .set({ deletedAt: now, updatedAt: now })
          .where(timerCondition)
          .returning();

        if (!updated[0]) {
          return yield* Effect.fail(
            new ResourceNotFoundError({ code: ErrorKey.TIMER_NOT_FOUND }),
          );
        }

        return timer;
      }),
    );

    const npcLevel = timerNpcField(resolved.npc, "lvl");

    const payload = {
      npcId: resolved.npcId,
      timerKey: resolved.timerKey,
      world,
      guildId: access.guild.id,
      routing: {
        tier: getNpcRoutingTier(resolved.npc),
        npcLevel: Schema.is(Schema.Number)(npcLevel) ? npcLevel : undefined,
      },
    };

    yield* ports.invalidateList(access.guild.id);
    yield* ports.publish(RabbitRoutingKey.GUILDS_TIMERS_DELETE, payload);
    yield* ports.publish(RabbitRoutingKey.NOTIFICATIONS_TIMER_DELETED, payload);
  });

  return (
    access: TimersGuildAccess,
    timerIdentifier: string,
    world?: string,
  ) =>
    world
      ? operation(access, timerIdentifier, world).pipe(
          Effect.mapError(toTimersDataFailure),
        )
      : Effect.fail(
          new TimersNotFound({ status: 404, code: ErrorKey.TIMER_NOT_FOUND }),
        );
};
