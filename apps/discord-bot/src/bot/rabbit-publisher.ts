import type { RabbitRoutingKeyName } from "@lootlog/protocol/rabbit/topology";

export interface RabbitPublisher {
  readonly publish: (
    exchange: string,
    routingKey: RabbitRoutingKeyName,
    payload: unknown,
  ) => Promise<void>;
}
