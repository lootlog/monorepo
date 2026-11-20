import type { EventPublisher } from "@lootlog/messaging";
import type { CanonicalRabbitEvent } from "@lootlog/protocol/rabbit/events";
import type { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { Effect } from "effect";

export type EventEmitRoutingKey =
  | typeof RabbitRoutingKey.EVENT_MAP_STATUS_UPDATE
  | typeof RabbitRoutingKey.EVENT_HERO_KILLED
  | typeof RabbitRoutingKey.EVENT_RANKING_UPDATE
  | typeof RabbitRoutingKey.EVENT_RESPAWN_WINDOW_OPENED
  | typeof RabbitRoutingKey.EVENT_RESPAWN_WINDOW_CLOSED;

/**
 * Event changes are refresh hints: the gateway drops a failed one and clients
 * refetch on the next. A failed publication is logged, never the caller's failure.
 */
export const makeEventEmitter = (publisher: EventPublisher) => {
  const emit = <K extends EventEmitRoutingKey>(
    routingKey: K,
    payload: CanonicalRabbitEvent<K>,
  ): Effect.Effect<void> =>
    publisher
      .publish(routingKey, payload)
      .pipe(
        Effect.catch((error) =>
          Effect.logError(`Failed to emit ${routingKey}`, error).pipe(
            Effect.annotateLogs({ context: "EventEmitter" }),
          ),
        ),
      );

  return { emit };
};

export type EventEmitter = ReturnType<typeof makeEventEmitter>;
