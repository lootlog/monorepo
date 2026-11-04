import type {
  RabbitDelivery,
  RabbitMessagingService,
} from "@lootlog/messaging";
import { RabbitExchange } from "@lootlog/protocol/rabbit/topology";
import { Effect, Schema } from "effect";
import {
  RabbitBridge,
  gatewayQueueDefinitions,
} from "../src/rabbit/rabbit-bridge.js";
import type { RealtimeHub } from "../src/realtime/realtime-hub.js";

export const createRabbitDelivery = (
  routingKey: string,
  content: Buffer,
  messageId?: string,
  redelivered = false,
): RabbitDelivery => {
  const properties: RabbitDelivery["properties"] = {
    messageId,
    contentType: "application/json",
    contentEncoding: undefined,
    headers: {},
    deliveryMode: 2,
    priority: undefined,
    correlationId: undefined,
    replyTo: undefined,
    expiration: undefined,
    timestamp: undefined,
    type: undefined,
    userId: undefined,
    appId: undefined,
    clusterId: undefined,
  };

  const fields = {
    consumerTag: "gateway-test",
    deliveryTag: 1,
    exchange: "default",
    routingKey,
    redelivered,
  };

  return {
    content,
    properties,
    ...fields,
    raw: { content, properties, fields },
  };
};

type BridgeDependencies = {
  readonly commands: ConstructorParameters<typeof RabbitBridge>[2];
  readonly presence: ConstructorParameters<typeof RabbitBridge>[3];
  readonly coverage: ConstructorParameters<typeof RabbitBridge>[4];
};

const unexpected = () => {
  throw new Error("Unexpected bridge collaborator call");
};

/**
 * A RabbitBridge over messaging that records each consumer, so a test delivers
 * a message to the queue bound to its routing key. Collaborators the test does
 * not pass throw when called.
 */
export const makeRabbitBridgeHarness = (
  hub: RealtimeHub,
  dependencies: Partial<BridgeDependencies> = {},
) => {
  const handlers = new Map<
    string,
    (delivery: RabbitDelivery) => Effect.Effect<void, unknown>
  >();

  const messaging: RabbitMessagingService = {
    publish: () => Effect.void,
    ack: () => Effect.void,
    nack: () => Effect.void,
    consume: (options, handler) =>
      Effect.sync(() => {
        handlers.set(options.queue, handler);

        return { consumerTag: options.queue, cancel: Effect.void };
      }),
  };

  const bridge = new RabbitBridge(
    messaging,
    hub,
    dependencies.commands ?? { rebalanceAcrossInstances: unexpected },
    dependencies.presence ?? { coverageForMap: unexpected },
    dependencies.coverage ?? { publish: unexpected },
  );

  /** Delivers to the main queue of `routingKey`; requires a started bridge. */
  const deliver = (
    routingKey: string,
    payload: typeof Schema.Json.Type,
    {
      messageId,
      redelivered = false,
    }: {
      readonly messageId?: string;
      readonly redelivered?: boolean;
    } = {},
  ) => {
    const queue = gatewayQueueDefinitions.find(
      (definition) =>
        definition.routingKey === routingKey &&
        definition.exchange === RabbitExchange.DEFAULT,
    );

    const handler = queue && handlers.get(queue.name);

    if (!handler) throw new Error(`No gateway consumer for ${routingKey}`);

    return handler(
      createRabbitDelivery(
        routingKey,
        Buffer.from(JSON.stringify(payload)),
        messageId,
        redelivered,
      ),
    );
  };

  return { bridge, messaging, handlers, deliver };
};
