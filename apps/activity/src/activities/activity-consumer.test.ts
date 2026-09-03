import { describe, expect, it, mock } from "bun:test";
import {
  RabbitMessaging,
  type RabbitDelivery,
  type RabbitMessagingService,
} from "@lootlog/messaging";
import {
  RabbitExchange,
  RabbitRoutingKey,
} from "@lootlog/protocol/rabbit/topology";
import { Effect, Layer, Redacted } from "effect";
import { RuntimeEnvironment } from "@lootlog/schema/runtime-environment";
import { ActivityConsumers, activityQueues } from "./activity-consumer.js";
import { ActivityRepository } from "./activity-repository.js";
import { ActivityConfig } from "#src/config/activity-config";

const malformedDelivery = (): RabbitDelivery => {
  const raw = {
    content: Buffer.from("not-json"),
    fields: {
      consumerTag: "consumer-1",
      deliveryTag: 1,
      redelivered: false,
      exchange: RabbitExchange.DEFAULT,
      routingKey: RabbitRoutingKey.ACTIVITY_LOG_CREATE,
    },
    properties: {
      contentType: "application/json",
      contentEncoding: undefined,
      headers: {},
      deliveryMode: 2,
      priority: undefined,
      correlationId: undefined,
      replyTo: undefined,
      expiration: undefined,
      messageId: undefined,
      timestamp: undefined,
      type: undefined,
      userId: undefined,
      appId: undefined,
      clusterId: undefined,
    },
  } as RabbitDelivery["raw"];
  return {
    content: new Uint8Array(raw.content),
    exchange: raw.fields.exchange,
    routingKey: raw.fields.routingKey,
    redelivered: raw.fields.redelivered,
    properties: raw.properties,
    raw,
  };
};

describe("Activity RabbitMQ topology", () => {
  it("keeps deployed queue names and routing keys", () => {
    expect(
      activityQueues.map(({ name, routingKey }) => [name, routingKey]),
    ).toEqual([
      ["activity-log-create", RabbitRoutingKey.ACTIVITY_LOG_CREATE],
      ["activity-log-create.retry", RabbitRoutingKey.ACTIVITY_LOG_CREATE_RETRY],
      ["activity-log-create.dlq", RabbitRoutingKey.ACTIVITY_LOG_CREATE_DLQ],
      ["guilds-members-remove", RabbitRoutingKey.GUILDS_MEMBERS_REMOVE],
      [
        "guilds-members-remove.retry",
        RabbitRoutingKey.GUILDS_MEMBERS_REMOVE_RETRY,
      ],
      ["guilds-members-remove.dlq", RabbitRoutingKey.GUILDS_MEMBERS_REMOVE_DLQ],
    ]);
  });

  it("uses broker dead-lettering through the retry exchange", () => {
    const main = activityQueues[0];
    const retry = activityQueues[1];
    expect(main.deadLetterExchange).toBe(RabbitExchange.RETRY);
    expect(retry.messageTtl).toBe(30_000);
    expect(retry.deadLetterExchange).toBe(RabbitExchange.DEFAULT);
  });

  it("dead-letters malformed JSON without invoking the repository", async () => {
    const handlers = new Map<
      string,
      (delivery: RabbitDelivery) => Effect.Effect<void, unknown>
    >();
    const publish = mock<RabbitMessagingService["publish"]>(() => Effect.void);
    const create = mock(() => Effect.void);
    const rabbit = RabbitMessaging.of({
      publish,
      ack: () => Effect.void,
      nack: () => Effect.void,
      consume: (options, handler) => {
        handlers.set(options.queue, handler);
        return Effect.succeed({
          consumerTag: options.queue,
          cancel: Effect.void,
        });
      },
    });
    const repository = ActivityRepository.of({
      create,
      clearActiveSessionsForMember: () => Effect.void,
      findMany: () => Effect.succeed({ data: [], hasMore: false }),
      findOne: () => Effect.die("unused"),
      deleteOne: () => Effect.die("unused"),
      memberStats: () => Effect.succeed([]),
      suggestActorNames: () => Effect.succeed([]),
      suggestWorlds: () => Effect.succeed([]),
      suggestClanNames: () => Effect.succeed([]),
    });
    const config = ActivityConfig.of({
      environment: RuntimeEnvironment.LOCAL,
      port: 0,
      serviceName: "activity-test",
      serviceNamespace: "test",
      databaseUrl: Redacted.make("postgresql://unused"),
      rabbitmqUri: Redacted.make("amqp://unused"),
      apiServiceUrl: "http://api.test",
      signatureSecret: Redacted.make("a".repeat(32)),
    });

    await Effect.runPromise(
      Effect.gen(function* () {
        yield* Layer.build(
          ActivityConsumers.pipe(
            Layer.provide(Layer.succeed(RabbitMessaging, rabbit)),
            Layer.provide(Layer.succeed(ActivityRepository, repository)),
            Layer.provide(Layer.succeed(ActivityConfig, config)),
          ),
        );
        const handler = handlers.get("activity-log-create");
        if (!handler) return yield* Effect.die("consumer was not registered");
        yield* handler(malformedDelivery());
      }).pipe(Effect.scoped),
    );

    expect(create).not.toHaveBeenCalled();
    expect(publish).toHaveBeenCalledTimes(1);
    expect(publish.mock.calls[0]?.[0].routingKey).toBe(
      RabbitRoutingKey.ACTIVITY_LOG_CREATE_DLQ,
    );
  });
});
