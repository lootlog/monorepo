import { ActivityConfig } from "#src/config/activity-config";
import { PgClient } from "@effect/sql-pg";
import {
  MessagingError,
  RabbitMessaging,
  type RabbitDelivery,
} from "@lootlog/messaging";
import {
  ACTIVITY_EVENT_SIGNATURE_HEADER,
  signActivityEvent,
} from "@lootlog/protocol/rabbit/activity-signature";
import {
  RabbitExchange,
  RabbitRoutingKey,
} from "@lootlog/protocol/rabbit/topology";
import { RuntimeEnvironment } from "@lootlog/schema/runtime-environment";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Effect, Layer, Redacted } from "effect";
import { OnlineConsumer } from "./online-consumer.js";
import {
  checkpoint,
  foldAllIntervals,
  startOnlineRepositoryHarness,
  type OnlineRepositoryHarness,
} from "./online-repository.integration.fixtures.js";
import { OnlineRepository } from "./online-repository.js";

describe("durable private online history queries and ingestion", () => {
  let harness: OnlineRepositoryHarness;

  beforeAll(async () => {
    harness = await startOnlineRepositoryHarness();
  }, 60_000);

  afterAll(async () => {
    await harness?.stop();
  });

  it("reports real contributing worlds across Warsaw midnight without double counting overlaps or hiding legacy provenance", async () => {
    await harness.runAt(
      "2026-09-06T12:00:00Z",
      Effect.gen(function* () {
        const repo = yield* OnlineRepository;
        yield* repo.ingest({
          version: 1,
          type: "collector",
          status: "healthy",
          observedAt: "2026-09-01T00:00:00Z",
        });

        const known = {
          ...checkpoint(
            "worlds",
            "a",
            "2026-09-04T21:00:00Z",
            "2026-09-04T23:00:00Z",
          ),
          world: "luvia",
        };

        yield* repo.ingest(known);
        yield* repo.ingest(known);
        yield* repo.ingest({
          ...checkpoint(
            "worlds",
            "b",
            "2026-09-04T22:00:00Z",
            "2026-09-04T23:00:00Z",
          ),
          world: "classic",
        });
        yield* repo.ingest(
          checkpoint(
            "worlds",
            "old",
            "2026-09-04T22:15:00Z",
            "2026-09-04T22:30:00Z",
          ),
        );
        yield* repo.ingest({
          ...checkpoint(
            "other-user",
            "other",
            "2026-09-04T22:00:00Z",
            "2026-09-04T23:00:00Z",
          ),
          world: "private",
        });
        yield* repo.ingest({
          ...checkpoint(
            "worlds",
            "zero",
            "2026-09-04T23:00:00Z",
            "2026-09-04T23:00:00Z",
          ),
          world: "zero",
        });

        const result = yield* repo.find("worlds", {
          from: "2026-09-04",
          to: "2026-09-06",
        });

        expect(
          result.days.map(({ onlineSeconds, worlds, worldsComplete }) => ({
            onlineSeconds,
            worlds,
            worldsComplete,
          })),
        ).toEqual([
          { onlineSeconds: 3600, worlds: ["luvia"], worldsComplete: true },
          {
            onlineSeconds: 3600,
            worlds: ["classic", "luvia"],
            worldsComplete: false,
          },
          { onlineSeconds: 0, worlds: [], worldsComplete: true },
        ]);

        for (const [world, seconds] of [
          ["luvia", [3600, 3600, 0]],
          ["classic", [0, 3600, 0]],
        ] as const) {
          const narrowed = yield* repo.find("worlds", {
            from: "2026-09-04",
            to: "2026-09-06",
            world,
          });

          expect(narrowed.world).toBe(world);
          expect(narrowed.days.map((day) => day.onlineSeconds)).toEqual([
            ...seconds,
          ]);
        }

        const changedWorld = yield* repo
          .ingest({ ...known, world: "changed" })
          .pipe(Effect.exit);

        expect(changedWorld._tag).toBe("Failure");
        yield* repo.ingest(
          checkpoint("worlds", "a", known.startedAt, "2026-09-05T00:00:00Z"),
        );
        yield* repo.ingest(known);

        const rollback = yield* repo.find("worlds", {
          from: "2026-09-04",
          to: "2026-09-05",
        });

        expect(rollback.days[0]?.worldsComplete).toBe(false);
        expect(rollback.days[0]?.worlds).toEqual([]);
        expect(rollback.days[1]?.onlineSeconds).toBe(7200);
      }),
    );
  });

  it("retains invalid signed events in the DLQ without blocking later checkpoints", async () => {
    const payload = checkpoint(
      "signed",
      "a",
      "2026-09-01T08:00:00Z",
      "2026-09-01T09:00:00Z",
    );

    const secret = "s".repeat(32);

    let consumeHandler:
      | ((delivery: RabbitDelivery) => Effect.Effect<void, unknown>)
      | undefined;

    const published: string[] = [];
    const rejectedEvents: unknown[] = [];
    let failDlq = false;

    const rabbit = RabbitMessaging.of({
      publish: (options) =>
        failDlq
          ? Effect.fail(
              new MessagingError({
                operation: "publish",
                message: "Broker confirm failed",
                cause: new Error("Broker unavailable"),
              }),
            )
          : Effect.sync(() => {
              published.push(options.routingKey);
              rejectedEvents.push(
                JSON.parse(new TextDecoder().decode(options.content)),
              );
            }),
      ack: () => Effect.void,
      nack: () => Effect.void,
      consume: (options, handler) => {
        consumeHandler = handler;

        return Effect.succeed({
          consumerTag: options.queue,
          cancel: Effect.void,
        });
      },
    });

    const delivery = (signature: string, event = payload): RabbitDelivery => {
      const raw: RabbitDelivery["raw"] = {
        content: Buffer.from(JSON.stringify(event)),
        fields: {
          consumerTag: "online",
          deliveryTag: 1,
          redelivered: true,
          exchange: RabbitExchange.DEFAULT,
          routingKey: RabbitRoutingKey.USERS_ONLINE_CHECKPOINT_V1,
        },
        properties: {
          contentType: "application/json",
          contentEncoding: undefined,
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
          headers: { [ACTIVITY_EVENT_SIGNATURE_HEADER]: signature },
        },
      };

      return {
        raw,
        content: raw.content,
        properties: raw.properties,
        exchange: raw.fields.exchange,
        routingKey: raw.fields.routingKey,
        redelivered: true,
      };
    };

    await Effect.runPromise(
      Effect.gen(function* () {
        yield* Layer.build(
          OnlineConsumer.pipe(
            Layer.provide(Layer.succeed(RabbitMessaging, rabbit)),
            Layer.provide(
              OnlineRepository.layer.pipe(Layer.provide(harness.database)),
            ),
            Layer.provide(
              Layer.succeed(ActivityConfig, {
                environment: RuntimeEnvironment.LOCAL,
                port: 0,
                serviceName: "online-test",
                serviceNamespace: "test",
                databaseUrl: Redacted.make(harness.postgres.getConnectionUri()),
                rabbitmqUri: Redacted.make("amqp://unused"),
                apiRpcUrl: "http://unused",
                signatureSecret: Redacted.make(secret),
              }),
            ),
          ),
        );

        if (!consumeHandler)
          return yield* Effect.die("Online consumer not installed");
        yield* consumeHandler(delivery("invalid"));
        yield* consumeHandler(delivery(signActivityEvent(payload, secret)));
        yield* consumeHandler(delivery(signActivityEvent(payload, secret)));

        const invalidInterval = { ...payload, endedAt: "2026-09-01T07:00:00Z" };
        yield* consumeHandler(
          delivery(signActivityEvent(invalidInterval, secret), invalidInterval),
        );

        const changedStart = { ...payload, startedAt: "2026-09-01T08:30:00Z" };
        failDlq = true;

        const rejection = yield* consumeHandler(
          delivery(signActivityEvent(changedStart, secret), changedStart),
        ).pipe(Effect.flip);

        expect(rejection).toBeInstanceOf(Error);
        failDlq = false;
        yield* consumeHandler(
          delivery(signActivityEvent(changedStart, secret), changedStart),
        );

        const later = {
          ...payload,
          endedAt: "2026-09-01T10:00:00Z",
          observedAt: "2026-09-01T10:00:00Z",
        };

        yield* consumeHandler(
          delivery(signActivityEvent(later, secret), later),
        );
      }).pipe(Effect.scoped),
    );
    expect(published).toEqual([
      "users.online.checkpoint.v1.dlq",
      "users.online.checkpoint.v1.dlq",
      "users.online.checkpoint.v1.dlq",
    ]);
    expect(rejectedEvents).toEqual([
      payload,
      { ...payload, endedAt: "2026-09-01T07:00:00Z" },
      { ...payload, startedAt: "2026-09-01T08:30:00Z" },
    ]);

    const result = await harness.run(
      Effect.gen(function* () {
        const repo = yield* OnlineRepository;

        return yield* repo.find("signed", {
          from: "2026-09-01",
          to: "2026-09-01",
        });
      }),
    );

    expect(result.days[0]?.onlineSeconds).toBe(7200);
  });

  it("rebuilds the same days from stored intervals, including the 25-hour Warsaw day", async () => {
    const range = { from: "2026-10-24", to: "2026-10-26" } as const;

    const days = await harness.run(
      Effect.gen(function* () {
        const repo = yield* OnlineRepository;
        const sql = yield* PgClient.PgClient;

        yield* repo.ingest({
          ...checkpoint(
            "rebuild",
            "long",
            "2026-10-24T20:00:00Z",
            "2026-10-26T01:00:00Z",
          ),
          world: "luvia",
        });
        yield* repo.ingest({
          ...checkpoint(
            "rebuild",
            "overlap",
            "2026-10-25T10:00:00Z",
            "2026-10-25T11:00:00Z",
          ),
          world: "classic",
        });

        const live = yield* repo.find("rebuild", range);

        yield* sql`DELETE FROM "UserOnlineDay" WHERE "userId" = 'rebuild'`;
        yield* foldAllIntervals(sql);

        return { live, rebuilt: yield* repo.find("rebuild", range) };
      }).pipe(Effect.provide(harness.database)),
    );

    expect(days.rebuilt).toEqual(days.live);
    expect(days.live.days.map((day) => day.onlineSeconds)).toEqual([
      7200, 90_000, 7200,
    ]);
  });
});
