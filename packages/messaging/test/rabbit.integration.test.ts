import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  makeDeadLetterQueue,
  makeRetryQueue,
  RabbitExchange,
  RabbitRoutingKey,
  type RabbitQueueDefinition,
} from "@lootlog/protocol/rabbit/topology";
import { Effect } from "effect";
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
    let resolveDeadLetter: ((value: Uint8Array) => void) | undefined;
    const deadLetter = new Promise<Uint8Array>((resolve) => {
      resolveDeadLetter = resolve;
    });

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
                deadLetterRoutingKey: RabbitRoutingKey.GUILDS_LOOTS_CREATE_DLQ,
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
          yield* messaging.consume(
            {
              queue: deadLetterQueue,
              failurePolicy: { strategy: "requeue" },
            },
            (delivery) =>
              Effect.sync(() => resolveDeadLetter?.(delivery.content)),
          );
          yield* messaging.publish({
            routingKey: RabbitRoutingKey.GUILDS_LOOTS_CREATE,
            content: new TextEncoder().encode('{"id":"message-1"}'),
            messageId: "message-1",
          });
          yield* Effect.promise(() => deadLetter).pipe(
            Effect.timeoutOrElse({
              duration: "10 seconds",
              orElse: () => Effect.die("RabbitMQ DLQ timeout"),
            }),
          );
          yield* Effect.sleep("50 millis");
        }).pipe(
          Effect.provide(
            RabbitMessaging.layer({
              uri: rabbitUri,
              connectionName: "lootlog-rewrite-integration",
              queues,
            }),
          ),
        ),
      ),
    );

    expect(new TextDecoder().decode(await deadLetter)).toBe(
      '{"id":"message-1"}',
    );
    expect(seenMainDeliveries).toEqual([
      { redelivered: false, retryCount: undefined },
      { redelivered: false, retryCount: 1 },
    ]);
  }, 15_000);
});
