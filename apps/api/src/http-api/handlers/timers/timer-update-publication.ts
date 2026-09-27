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

export const publishTimerUpdate = Effect.fnUntraced(function* (
  ports: TimerUpdatePorts,
  guildId: string,
  projection: CachedTimerProjection,
) {
  const response = mapTimerResponse(projection);
  yield* ports.invalidateList(guildId);
  yield* ports.publish(RabbitRoutingKey.GUILDS_TIMERS_UPDATE, response);
  yield* ports.publish(RabbitRoutingKey.NOTIFICATIONS_TIMER_UPDATED, response);

  return response;
});
