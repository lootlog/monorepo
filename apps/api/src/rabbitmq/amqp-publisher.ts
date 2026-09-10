import type { Effect } from "effect";
import type { EventEmitPayloads } from "#src/events/event-emitter";
import type { TimerPublishedEvent } from "#src/timers/timer-projection";
import type {
  RabbitExchangeName,
  RabbitRoutingKey,
} from "@lootlog/protocol/rabbit/topology";

type TimerRoutingKey =
  | typeof RabbitRoutingKey.GUILDS_TIMERS_UPDATE
  | typeof RabbitRoutingKey.NOTIFICATIONS_TIMER_UPDATED
  | typeof RabbitRoutingKey.GUILDS_TIMERS_DELETE
  | typeof RabbitRoutingKey.NOTIFICATIONS_TIMER_DELETED;

export interface AmqpPublisher {
  publish<Key extends keyof EventEmitPayloads>(
    exchange: RabbitExchangeName,
    routingKey: Key,
    payload: EventEmitPayloads[Key],
  ): Effect.Effect<unknown, unknown>;
  publish<Key extends TimerRoutingKey>(
    exchange: RabbitExchangeName,
    routingKey: Key,
    payload: TimerPublishedEvent<Key>,
  ): Effect.Effect<unknown, unknown>;
}
