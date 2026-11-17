import { ignorePublicationFailure } from "#src/shared/best-effort-publication";
import { publishTimerEvents } from "./timer-update-publication.js";
import { randomUUID } from "node:crypto";
import { Effect, Predicate, Schema } from "effect";
import { decodeJsonUnknown } from "#src/shared/schema/json";
import { loadHeroSightings } from "#src/hero-sightings/hero-sighting-query";
import type { HeroSightingResponse } from "#src/contracts/hero-sightings/schemas";
import { getNpcRoutingTier } from "@lootlog/domain/npc-routing";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import type { ApiDatabase } from "#src/database/drizzle/database";
import {
  InvalidRequestError,
  ResourceConflictError,
} from "#src/shared/http/http-errors";
import { ErrorKey } from "#src/timers/error-key";
import { buildTimerKey } from "#src/timers/timer-key";
import { getTimerNpcId } from "@lootlog/domain/npc-identity";
import type { CreateAutoTimerRequest } from "#src/contracts/timers/schemas";
import type { TimersIdentity } from "./timers-data.js";
import { TimersInfrastructureError } from "./timer-errors.js";
import {
  CachedTimerProjectionSchema,
  mapTimerResponse,
  type TimerPublishedEvent,
} from "#src/timers/timer-projection";
import { hasTimerWeight, makeNpc } from "./timer-auto-report.js";
import {
  DEDUP_TTL_SECONDS,
  persistAutoTimer,
  type AutoTimerPersistencePorts,
} from "./timer-auto.repository.js";

export interface AutoTimerGuildWritePorts extends AutoTimerPersistencePorts {
  readonly get: (key: string) => Effect.Effect<string | null, unknown>;
  readonly invalidateList: (guildId: string) => Effect.Effect<unknown, unknown>;
  readonly publishHeroSighting: (
    sighting: HeroSightingResponse,
  ) => Effect.Effect<unknown, unknown>;
  readonly publish: <
    Key extends
      | typeof RabbitRoutingKey.GUILDS_TIMERS_DELETE
      | typeof RabbitRoutingKey.GUILDS_TIMERS_UPDATE
      | typeof RabbitRoutingKey.NOTIFICATIONS_TIMER_DELETED
      | typeof RabbitRoutingKey.NOTIFICATIONS_TIMER_UPDATED,
  >(
    routingKey: Key,
    payload: TimerPublishedEvent<Key>,
  ) => Effect.Effect<unknown, unknown>;
  readonly releaseDedup: (
    key: string,
    token: string,
  ) => Effect.Effect<unknown, never>;
  readonly set: (
    key: string,
    value: string,
    ttlSeconds: number,
  ) => Effect.Effect<unknown, unknown>;
  /** Wakes the dispatcher for checks committed with a timer. */
  readonly signalEventHeroChecks: Effect.Effect<void>;
  readonly setNx: (
    key: string,
    value: string,
    ttlSeconds: number,
  ) => Effect.Effect<boolean, unknown>;
}

const projectionFromCache = (value: string) =>
  Effect.try({
    try: () =>
      mapTimerResponse(
        Schema.decodeUnknownSync(CachedTimerProjectionSchema)(
          decodeJsonUnknown(value),
        ),
      ),
    catch: (cause) => new TimersInfrastructureError({ cause }),
  });

/**
 * Records a reported kill in one Lootlog and publishes it. Concurrent and
 * retried reports of the same kill share one stored timer.
 */
export const writeGuildTimer = (
  database: typeof ApiDatabase.Service,
  ports: AutoTimerGuildWritePorts,
  identity: TimersIdentity,
  guildId: string,
  payload: CreateAutoTimerRequest,
) => {
  const timerNpcId = getTimerNpcId(payload.npc);
  const timerKey = buildTimerKey(timerNpcId, payload.npc.name);
  const dedupKey = `timer:dedup:${guildId}:${payload.world}:${timerKey}`;
  const dedupLockKey = `${dedupKey}:lock`;

  const persist = persistAutoTimer(database, ports, identity, payload, {
    guildId,
    timerNpcId,
    timerKey,
  });

  return Effect.gen(function* () {
    if (!hasTimerWeight(payload)) {
      return yield* Effect.fail(
        new InvalidRequestError({ code: ErrorKey.WT_TOO_LOW }),
      );
    }

    const cached = yield* ports.get(dedupKey);

    if (cached) return yield* projectionFromCache(cached);
    const token = randomUUID();
    let acquired = yield* ports.setNx(dedupLockKey, token, DEDUP_TTL_SECONDS);

    if (!acquired) {
      for (let attempt = 0; attempt < 100; attempt += 1) {
        yield* Effect.sleep("50 millis");
        const result = yield* ports.get(dedupKey);

        if (result) return yield* projectionFromCache(result);
        acquired = yield* ports.setNx(dedupLockKey, token, DEDUP_TTL_SECONDS);

        if (acquired) break;
      }

      if (!acquired) {
        return yield* Effect.fail(
          new ResourceConflictError({
            code: ErrorKey.TIMER_RACE_CONDITION,
          }),
        );
      }
    }

    return yield* Effect.ensuring(
      Effect.gen(function* () {
        const cachedAfterLock = yield* ports.get(dedupKey);

        if (cachedAfterLock) return yield* projectionFromCache(cachedAfterLock);

        const result = yield* persist;
        const response = mapTimerResponse(result.projection);

        if (Predicate.isTagged(result, "Duplicate")) return response;
        yield* ports.signalEventHeroChecks;

        // The dedup entry is written only after publication succeeds, so a
        // retry of a failed attempt republishes instead of returning it.
        yield* ports.invalidateList(guildId);

        if (
          Predicate.isTagged(result, "Created") &&
          result.migratedSyntheticNpcId !== null
        ) {
          const deletion = {
            guildId,
            world: payload.world,
            npcId: result.migratedSyntheticNpcId,
            timerKey: result.migratedSyntheticTimerKey ?? undefined,
            routing: {
              tier: getNpcRoutingTier(makeNpc(payload)),
              npcLevel: payload.npc.lvl,
            },
          };

          yield* publishTimerEvents(
            ports.publish(RabbitRoutingKey.GUILDS_TIMERS_DELETE, deletion),
            ports.publish(
              RabbitRoutingKey.NOTIFICATIONS_TIMER_DELETED,
              deletion,
            ),
          );
        }

        yield* publishTimerEvents(
          ports.publish(RabbitRoutingKey.GUILDS_TIMERS_UPDATE, response),
          ports.publish(RabbitRoutingKey.NOTIFICATIONS_TIMER_UPDATED, response),
        );
        yield* ports.set(
          dedupKey,
          JSON.stringify(result.projection),
          DEDUP_TTL_SECONDS,
        );

        if (Predicate.isTagged(result, "Unpublished")) return response;

        if (result.closedHeroSightingId !== null) {
          const closed = yield* loadHeroSightings(database, [
            result.closedHeroSightingId,
          ]);

          yield* Effect.forEach(closed, ports.publishHeroSighting).pipe(
            ignorePublicationFailure,
          );
        }

        return response;
      }),
      ports.releaseDedup(dedupLockKey, token),
    );
  });
};
