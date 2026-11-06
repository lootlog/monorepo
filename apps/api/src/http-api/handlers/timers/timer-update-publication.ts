import { Effect } from "effect";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import {
  mapTimerResponse,
  type CachedTimerProjection,
  type TimerPublishedEvent,
} from "#src/timers/timer-projection";

export interface TimerUpdatePorts {
  readonly invalidateList: (guildId: string) => Effect.Effect<unknown, unknown>;
  readonly publish: <
    Key extends
      | typeof RabbitRoutingKey.GUILDS_TIMERS_UPDATE
      | typeof RabbitRoutingKey.NOTIFICATIONS_TIMER_UPDATED,
  >(
    routingKey: Key,
    payload: TimerPublishedEvent<Key>,
  ) => Effect.Effect<unknown, unknown>;
}

/** Publishes the realtime and notification facts together; both are attempted even when one fails. */
export const publishTimerEvents = Effect.fnUntraced(function* (
  realtime: Effect.Effect<unknown, unknown>,
  notifications: Effect.Effect<unknown, unknown>,
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
  yield* ports.invalidateList(guildId);
  yield* publishTimerEvents(
    ports.publish(RabbitRoutingKey.GUILDS_TIMERS_UPDATE, response),
    ports.publish(RabbitRoutingKey.NOTIFICATIONS_TIMER_UPDATED, response),
  );

  return response;
});
