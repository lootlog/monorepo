import type {
  CanonicalRabbitEvent,
  CanonicalRabbitEventRoutingKey,
} from "@lootlog/protocol/rabbit/events";
import type { Effect } from "effect";

export interface RabbitPublisher {
  readonly publish: <RoutingKey extends CanonicalRabbitEventRoutingKey>(
    exchange: string,
    routingKey: RoutingKey,
    payload: CanonicalRabbitEvent<RoutingKey>,
  ) => Effect.Effect<void, unknown>;
}
