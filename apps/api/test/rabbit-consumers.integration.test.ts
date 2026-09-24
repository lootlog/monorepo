import { expect, test } from "bun:test";
import { RabbitMessaging } from "@lootlog/messaging";
import {
  RabbitExchange,
  RabbitRoutingKey,
} from "@lootlog/protocol/rabbit/topology";
import { Deferred, Effect, Schema } from "effect";
import { GenericContainer } from "testcontainers";
import { makeRabbitConsumer } from "#src/runtime/background/rabbit-consumer";

test("API backlog shares handler capacity across queues while ordered failures recover", async () => {
  const broker = await new GenericContainer("rabbitmq:3.13-alpine")
    .withExposedPorts(5672)
    .withStartupTimeout(120_000)
    .start();

  const queueNames = Array.from(
    { length: 7 },
    (_, index) => `api-backlog-${index}-${crypto.randomUUID()}`,
  );

  const successfulByQueue = new Map<string, string[]>();
  const redeliveredQueues = new Set<string>();
  let active = 0;
  let peakActive = 0;
  let completed = 0;

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

  try {
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

        const queues = yield* readQueues;

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

        const drained = yield* readQueues;

        for (const queue of drained) {
          expect(queue).toMatchObject({
            messages_ready: 0,
            messages_unacknowledged: 0,
          });
        }
      }).pipe(
        Effect.provide(
          RabbitMessaging.layer({
            uri: `amqp://${broker.getHost()}:${broker.getMappedPort(5672)}`,
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
  } finally {
    await broker.stop();
  }
}, 150_000);
