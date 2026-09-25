import { afterAll, beforeAll, expect, test } from "bun:test";
import { RabbitMessaging } from "@lootlog/messaging";
import {
  RabbitExchange,
  RabbitRoutingKey,
} from "@lootlog/protocol/rabbit/topology";
import { Deferred, Effect, Schema } from "effect";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { Queue } from "#src/rabbitmq/queue";
import { makeRabbitConsumer } from "#src/runtime/background/rabbit-consumer";
import {
  apiRabbitQueues,
  apiRabbitRetry,
} from "#src/runtime/infrastructure/api-rabbit";

let broker: StartedTestContainer;

beforeAll(async () => {
  broker = await new GenericContainer("rabbitmq:3.13-alpine")
    .withExposedPorts(5672)
    .withStartupTimeout(120_000)
    .start();
}, 150_000);

afterAll(async () => {
  await broker.stop();
});

const brokerUri = () =>
  `amqp://${broker.getHost()}:${broker.getMappedPort(5672)}`;

const readQueues = Effect.promise(async () => {
  const result = await broker.exec([
    "rabbitmqctl",
    "list_queues",
    "name",
    "messages_ready",
    "messages_unacknowledged",
    "--formatter=json",
  ]);

  expect(result.exitCode).toBe(0);

  return Schema.decodeUnknownSync(
    Schema.Array(
      Schema.Struct({
        name: Schema.String,
        messages_ready: Schema.Number,
        messages_unacknowledged: Schema.Number,
      }),
    ),
  )(JSON.parse(result.output));
});

test("API backlog shares handler capacity across queues while ordered failures recover", async () => {
  const queueNames = Array.from(
    { length: 7 },
    (_, index) => `api-backlog-${index}-${crypto.randomUUID()}`,
  );

  const successfulByQueue = new Map<string, string[]>();
  const redeliveredQueues = new Set<string>();
  let active = 0;
  let peakActive = 0;
  let completed = 0;

  await Effect.runPromise(
    Effect.gen(function* () {
      const messaging = yield* RabbitMessaging;
      const consume = yield* makeRabbitConsumer(messaging);
      const saturated = yield* Deferred.make<void>();
      const release = yield* Deferred.make<void>();
      const finished = yield* Deferred.make<void>();

      for (const queue of queueNames) {
        yield* consume(
          queue,
          RabbitRoutingKey.GUILDS_DELETE,
          ({ guildId }, delivery) =>
            Effect.gen(function* () {
              active++;
              peakActive = Math.max(peakActive, active);

              if (active === 5) yield* Deferred.succeed(saturated, undefined);

              if (guildId === "first") {
                yield* Deferred.await(release);

                if (!delivery.redelivered) {
                  return yield* Effect.fail("temporary database failure");
                }

                redeliveredQueues.add(queue);
              }

              const successful = successfulByQueue.get(queue) ?? [];
              successful.push(guildId);
              successfulByQueue.set(queue, successful);
              completed++;

              if (completed === queueNames.length * 2) {
                yield* Deferred.succeed(finished, undefined);
              }
            }).pipe(
              Effect.ensuring(
                Effect.sync(() => {
                  active--;
                }),
              ),
            ),
          { strategy: "requeue" },
        );
      }

      for (const guildId of ["first", "second"]) {
        yield* messaging.publish({
          routingKey: RabbitRoutingKey.GUILDS_DELETE,
          content: new TextEncoder().encode(JSON.stringify({ guildId })),
        });
      }

      yield* Deferred.await(saturated);

      const queues = (yield* readQueues).filter(({ name }) =>
        queueNames.includes(name),
      );

      expect(active).toBe(5);
      expect(completed).toBe(0);
      expect(queues).toHaveLength(queueNames.length);

      for (const queue of queues) {
        expect(queue).toMatchObject({
          messages_ready: 1,
          messages_unacknowledged: 1,
        });
      }

      yield* Deferred.succeed(release, undefined);
      yield* Deferred.await(finished);

      const drained = (yield* readQueues).filter(({ name }) =>
        queueNames.includes(name),
      );

      for (const queue of drained) {
        expect(queue).toMatchObject({
          messages_ready: 0,
          messages_unacknowledged: 0,
        });
      }
    }).pipe(
      Effect.provide(
        RabbitMessaging.layer({
          uri: brokerUri(),
          queues: queueNames.map((name) => ({
            name,
            exchange: RabbitExchange.DEFAULT,
            routingKey: RabbitRoutingKey.GUILDS_DELETE,
            durable: false,
          })),
        }),
      ),
      Effect.scoped,
      RabbitMessaging.supervised,
      Effect.timeout("15 seconds"),
    ),
  );

  expect(peakActive).toBe(5);
  expect(active).toBe(0);
  expect(redeliveredQueues.size).toBe(queueNames.length);

  for (const queue of queueNames) {
    expect(successfulByQueue.get(queue)).toEqual(["first", "second"]);
  }
}, 60_000);

test("a poison delivery cannot block the next fact on a retrying queue", async () => {
  const topology: ReadonlyArray<string> = [
    Queue.GAME_CHARACTER_OFFLINE,
    Queue.GAME_CHARACTER_OFFLINE_RETRY,
    Queue.GAME_CHARACTER_OFFLINE_DLQ,
  ];

  const handled: string[] = [];

  const offline = (characterId: string) =>
    new TextEncoder().encode(
      JSON.stringify({
        userId: "user-1",
        discordId: "discord-1",
        world: "tempest",
        characterId,
        organizationIds: ["organization-1"],
        disconnectedAt: 1,
      }),
    );

  await Effect.runPromise(
    Effect.gen(function* () {
      const messaging = yield* RabbitMessaging;
      const consume = yield* makeRabbitConsumer(messaging);
      const nextHandled = yield* Deferred.make<void>();

      yield* consume(
        Queue.GAME_CHARACTER_OFFLINE,
        RabbitRoutingKey.GAME_CHARACTER_OFFLINE,
        ({ characterId }) =>
          Effect.gen(function* () {
            handled.push(characterId);

            if (characterId === "failing") {
              return yield* Effect.fail("temporary database failure");
            }

            yield* Deferred.succeed(nextHandled, undefined);
          }),
        apiRabbitRetry.characterOffline,
      );

      for (const content of [
        new TextEncoder().encode('{"characterId":'),
        offline("failing"),
        offline("next"),
      ]) {
        yield* messaging.publish({
          routingKey: RabbitRoutingKey.GAME_CHARACTER_OFFLINE,
          content,
        });
      }

      yield* Deferred.await(nextHandled);

      const queues = new Map(
        (yield* readQueues).map((queue) => [queue.name, queue]),
      );

      const main = queues.get(Queue.GAME_CHARACTER_OFFLINE);
      const retry = queues.get(Queue.GAME_CHARACTER_OFFLINE_RETRY);

      // The undecodable payload skips retries; the failed fact waits for one.
      expect(queues.get(Queue.GAME_CHARACTER_OFFLINE_DLQ)).toMatchObject({
        messages_ready: 1,
      });
      expect(
        (main?.messages_ready ?? 0) +
          (main?.messages_unacknowledged ?? 0) +
          (retry?.messages_ready ?? 0),
      ).toBe(1);
    }).pipe(
      Effect.provide(
        RabbitMessaging.layer({
          uri: brokerUri(),
          queues: apiRabbitQueues.filter(({ name }) => topology.includes(name)),
        }),
      ),
      Effect.scoped,
      RabbitMessaging.supervised,
      Effect.timeout("15 seconds"),
    ),
  );

  expect(handled.slice(0, 2)).toEqual(["failing", "next"]);
}, 60_000);
