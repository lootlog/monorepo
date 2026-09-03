import { describe, expect, it, mock } from "bun:test";
import { RuntimeEnvironment } from "@lootlog/schema/runtime-environment";
import { Effect, Layer, Queue, Redacted } from "effect";
import { Redis } from "effect/unstable/persistence";
import { ActivityConfig } from "#src/config/activity-config";
import { ApiHttpClient } from "#src/http/api-http-client";
import { Permissions } from "./activity-permissions.js";

describe("Activity permissions", () => {
  it("falls back to the API when the Redis cache is malformed", async () => {
    const get = mock(() =>
      Effect.succeed({
        status: 200,
        body: new TextEncoder().encode("[]"),
      }),
    );
    const redis = Redis.Redis.of({
      send: <A>(command: string) =>
        Effect.succeed((command === "GET" ? "not-json" : "OK") as unknown as A),
      subscribe: () => Queue.unbounded<Redis.RedisMessage, Redis.RedisError>(),
      eval:
        <
          Config extends {
            readonly params: ReadonlyArray<unknown>;
            readonly result: unknown;
          },
        >() =>
        (..._params: Config["params"]) =>
          Effect.die("unused"),
    });
    const config = ActivityConfig.of({
      environment: RuntimeEnvironment.LOCAL,
      port: 0,
      serviceName: "activity-test",
      serviceNamespace: "test",
      databaseUrl: Redacted.make("postgresql://unused"),
      rabbitmqUri: Redacted.make("amqp://unused"),
      redisUrl: Redacted.make("redis://configured"),
      apiServiceUrl: "http://api.test",
      signatureSecret: Redacted.make("a".repeat(32)),
    });

    const permissions = await Effect.runPromise(
      Effect.flatMap(Permissions, (service) =>
        service.getUserGuildPermissions("discord-1", "user-1", "guild-1"),
      ).pipe(
        Effect.provide(Permissions.layer),
        Effect.provide(Layer.succeed(ApiHttpClient, ApiHttpClient.of({ get }))),
        Effect.provide(Layer.succeed(ActivityConfig, config)),
        Effect.provide(Layer.succeed(Redis.Redis, redis)),
      ),
    );

    expect(permissions).toEqual([]);
    expect(get).toHaveBeenCalledTimes(1);
  });
});
