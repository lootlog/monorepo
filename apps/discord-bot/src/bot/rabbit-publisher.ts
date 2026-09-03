import type { RabbitRoutingKeyName } from "@lootlog/protocol/rabbit/topology";
import type { Effect } from "effect";

export interface RabbitPublisher {
  readonly publish: (
    exchange: string,
    routingKey: RabbitRoutingKeyName,
    payload: unknown,
  ) => Effect.Effect<void, unknown>;
}
