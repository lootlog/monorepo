import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  makeDeadLetterQueue,
  makeRetryQueue,
  RabbitExchange,
  RabbitRoutingKey,
  type RabbitQueueDefinition,
} from "@lootlog/protocol/rabbit/topology";
import { Effect } from "effect";
import amqp from "amqplib";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { RabbitMessaging } from "../src/messaging.ts";

let rabbit: StartedTestContainer;
let rabbitUri: string;

describe("RabbitMessaging real broker integration", () => {
  beforeAll(async () => {
    rabbit = await new GenericContainer("rabbitmq:3.13-alpine")
      .withExposedPorts(5672)
      .withStartupTimeout(60_000)
      .start();
    rabbitUri = `amqp://${rabbit.getHost()}:${rabbit.getMappedPort(5672)}`;
  }, 60_000);

  afterAll(async () => {
    await rabbit.stop();
  });

  test("confirms, retries through TTL, redelivers and dead-letters", async () => {
    const suffix = crypto.randomUUID();
    const mainQueue = `lootlog-rewrite-main-${suffix}`;
    const retryQueue = `lootlog-rewrite-retry-${suffix}`;
    const deadLetterQueue = `lootlog-rewrite-dlq-${suffix}`;
    const queues: RabbitQueueDefinition[] = [
      {
        name: mainQueue,
        exchange: RabbitExchange.DEFAULT,
        routingKey: RabbitRoutingKey.GUILDS_LOOTS_CREATE,
        durable: false,
      },
      makeRetryQueue({
        name: retryQueue,
        retryRoutingKey: RabbitRoutingKey.GUILDS_LOOTS_CREATE_RETRY,
        destinationRoutingKey: RabbitRoutingKey.GUILDS_LOOTS_CREATE,
        messageTtl: 100,
      }),
      makeDeadLetterQueue({
        name: deadLetterQueue,
        routingKey: RabbitRoutingKey.GUILDS_LOOTS_CREATE_DLQ,
      }),
    ];
    const seenMainDeliveries: Array<{
      redelivered: boolean;
      retryCount: unknown;
    }> = [];
    const inspection = await amqp.connect(rabbitUri);
    const channel = await inspection.createChannel();
    try {
      await Effect.runPromise(
        Effect.scoped(
          Effect.gen(function* () {
            const messaging = yield* RabbitMessaging;
            yield* messaging.consume(
              {
                queue: mainQueue,
                failurePolicy: {
                  strategy: "retry",
                  maxRetries: 1,
                  retryRoutingKey: RabbitRoutingKey.GUILDS_LOOTS_CREATE_RETRY,
                  deadLetterRoutingKey:
                    RabbitRoutingKey.GUILDS_LOOTS_CREATE_DLQ,
                },
              },
              (delivery) =>
                Effect.sync(() => {
                  seenMainDeliveries.push({
                    redelivered: delivery.redelivered,
                    retryCount:
                      delivery.properties.headers?.["x-lootlog-retry-count"],
                  });
                }).pipe(Effect.andThen(Effect.fail("force retry"))),
            );
            yield* messaging.publish({
              routingKey: RabbitRoutingKey.GUILDS_LOOTS_CREATE,
              content: new TextEncoder().encode('{"id":"message-1"}'),
              messageId: "message-1",
            });
            yield* Effect.gen(function* () {
              while (true) {
                const queue = yield* Effect.promise(() =>
                  channel.checkQueue(deadLetterQueue),
                );
                if (queue.messageCount === 1) break;
                yield* Effect.sleep("25 millis");
              }
            }).pipe(Effect.timeout("10 seconds"));
          }).pipe(
            Effect.provide(
              RabbitMessaging.layer({
                uri: rabbitUri,
                connectionName: "lootlog-rewrite-integration",
                queues,
              }),
            ),
          ),
        ).pipe(RabbitMessaging.supervised),
      );
      // Inspect after the application scope has closed: the recovery message
      // must still be available, with no automatic DLQ consumer draining it.
      expect(await channel.checkQueue(deadLetterQueue)).toMatchObject({
        messageCount: 1,
        consumerCount: 0,
      });
      const retained = await channel.get(deadLetterQueue, { noAck: false });
      expect(retained && retained.content.toString()).toBe(
        '{"id":"message-1"}',
      );
      expect(retained && retained.properties.messageId).toBe("message-1");
    } finally {
      await channel.close();
      await inspection.close();
    }
    expect(seenMainDeliveries).toEqual([
      { redelivered: false, retryCount: undefined },
      { redelivered: false, retryCount: 1 },
    ]);
  }, 15_000);

  test("broker cancellation of a subscription fails the application", async () => {
    const queue = `consumer-cancel-${crypto.randomUUID()}`;
    const failure = await Effect.runPromise(
      Effect.gen(function* () {
        const messaging = yield* RabbitMessaging;
        yield* messaging.consume(
          { queue, failurePolicy: { strategy: "requeue" } },
          () => Effect.void,
        );
        yield* Effect.promise(() =>
          rabbit.exec(["rabbitmqctl", "delete_queue", queue]),
        );
        yield* Effect.never;
      }).pipe(
        Effect.provide(
          RabbitMessaging.layer({
            uri: rabbitUri,
            queues: [
              {
                name: queue,
                exchange: RabbitExchange.DEFAULT,
                routingKey: RabbitRoutingKey.GUILDS_CREATE,
                durable: false,
              },
            ],
          }),
        ),
        Effect.scoped,
        RabbitMessaging.supervised,
        Effect.flip,
        Effect.timeout("10 seconds"),
      ),
    );
    expect(failure.message).toContain("consumer cancelled by broker");
  }, 15_000);

  test("an established connection failure shuts down the supervised application", async () => {
    const failure = await Effect.runPromise(
      Effect.gen(function* () {
        yield* RabbitMessaging;
        yield* Effect.promise(() =>
          rabbit.exec([
            "rabbitmqctl",
            "close_all_connections",
            "connection lifecycle test",
          ]),
        );
        yield* Effect.never;
      }).pipe(
        Effect.provide(RabbitMessaging.layer({ uri: rabbitUri })),
        RabbitMessaging.supervised,
        Effect.flip,
        Effect.timeout("10 seconds"),
      ),
    );
    expect(failure.operation).toBe("connect");
  }, 15_000);
});
