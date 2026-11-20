import type { EventPublisher, MessagingError } from "@lootlog/messaging";
import { Effect } from "effect";
import type { RedisError } from "effect/persistence/Redis";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import {
  mapTimerResponse,
  toTimerEvent,
  type CachedTimerProjection,
} from "./timer-projection.js";

export interface TimerUpdatePorts {
  readonly invalidateList: (guildId: string) => Effect.Effect<void, RedisError>;
  readonly publish: EventPublisher["publish"];
}

/** Publishes the realtime and notification facts together; both are attempted even when one fails. */
export const publishTimerEvents = Effect.fnUntraced(function* (
  realtime: Effect.Effect<void, MessagingError>,
  notifications: Effect.Effect<void, MessagingError>,
) {
  const results = yield* Effect.all([realtime, notifications], {
    concurrency: 2,
    mode: "result",
  });

  for (const result of results) yield* Effect.fromResult(result);
});

export const publishTimerUpdate = Effect.fnUntraced(function* (
  ports: TimerUpdatePorts,
  guildId: string,
  projection: CachedTimerProjection,
) {
  const response = mapTimerResponse(projection);
  const event = toTimerEvent(response);
  yield* ports.invalidateList(guildId);
  yield* publishTimerEvents(
    ports.publish(RabbitRoutingKey.GUILDS_TIMERS_UPDATE, event),
    ports.publish(RabbitRoutingKey.NOTIFICATIONS_TIMER_UPDATED, event),
  );

  return response;
});
