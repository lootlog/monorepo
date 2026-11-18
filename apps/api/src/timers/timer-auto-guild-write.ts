import type { EventPublisher } from "@lootlog/messaging";
import { ignorePublicationFailure } from "#src/shared/best-effort-publication";
import { publishTimerEvents } from "./timer-update-publication.js";
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
  toTimerEvent,
} from "#src/timers/timer-projection";
import { hasTimerWeight, makeNpc } from "./timer-auto-report.js";
import type { RedisLockManager } from "#src/redis/redlock";
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
  readonly publish: EventPublisher["publish"];
  readonly set: (
    key: string,
    value: string,
    ttlSeconds: number,
  ) => Effect.Effect<unknown, unknown>;
  /** Wakes the dispatcher for checks committed with a timer. */
  readonly signalEventHeroChecks: Effect.Effect<void>;
  readonly locks: Pick<RedisLockManager, "singleFlight">;
}

// A concurrent report of the same kill waits up to 5 s for the first one.
const DEDUP_LOCK_WAIT = { retryCount: 100, retryDelay: 50, retryJitter: 0 };

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

    return yield* ports.locks.singleFlight(
      {
        resource: dedupLockKey,
        duration: DEDUP_TTL_SECONDS * 1000,
        wait: DEDUP_LOCK_WAIT,
        unavailable: () =>
          new ResourceConflictError({ code: ErrorKey.TIMER_RACE_CONDITION }),
      },
      ports
        .get(dedupKey)
        .pipe(
          Effect.flatMap((cached) =>
            cached
              ? Effect.asSome(projectionFromCache(cached))
              : Effect.succeedNone,
          ),
        ),
      Effect.gen(function* () {
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
          ports.publish(
            RabbitRoutingKey.GUILDS_TIMERS_UPDATE,
            toTimerEvent(response),
          ),
          ports.publish(
            RabbitRoutingKey.NOTIFICATIONS_TIMER_UPDATED,
            toTimerEvent(response),
          ),
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
    );
  });
};
