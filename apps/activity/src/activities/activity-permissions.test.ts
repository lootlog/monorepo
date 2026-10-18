import { describe, expect, it, mock } from "bun:test";
import { Permission } from "@lootlog/schema/permissions";
import { RuntimeEnvironment } from "@lootlog/schema/runtime-environment";
import { Effect, Layer, Queue, Redacted } from "effect";
import { Redis } from "effect/persistence";
import { ActivityConfig } from "#src/config/activity-config";
import { ApiHttpClient } from "#src/http/api-http-client";
import { Permissions } from "./activity-permissions.js";

describe("Activity permissions", () => {
  it("drops an admin's access as soon as the API stops granting it", async () => {
    const adminGrant = [
      {
        guild: { id: "guild-1", ownerId: "owner" },
        roles: [
          {
            id: "admin",
            lvlRangeFrom: 0,
            lvlRangeTo: 999,
            permissions: [Permission.ADMIN],
          },
        ],
      },
    ];

    const responses = [adminGrant, []];

    const get = mock(() =>
      Effect.succeed({
        status: 200,
        body: new TextEncoder().encode(JSON.stringify(responses.shift())),
      }),
    );

    // A working Redis, so any cache placed in front of the API would serve
    // the stale grant on the second read.
    const store = new Map<string, string>();

    const redis = Redis.Redis.of({
      send: <A>(command: string, ...args: ReadonlyArray<string>) => {
        const [key = "", value = ""] = args;

        if (command === "SET") store.set(key, value);

        const reply =
          command === "GET" ? (store.get(key) ?? null) : ("OK" as const);

        // SAFETY: This fake answers GET with string | null and PING/SET with "OK"; Redis's caller-selected A is erased at this fake transport boundary.
        return Effect.succeed(reply as A);
      },
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

    const read = Effect.flatMap(Permissions, (service) =>
      service.getUserGuildPermissions("discord-1", "user-1", "guild-1"),
    );

    const [before, after] = await Effect.runPromise(
      Effect.all([read, read]).pipe(
        Effect.provide(Permissions.layer),
        Effect.provide(Layer.succeed(ApiHttpClient, ApiHttpClient.of({ get }))),
        Effect.provide(Layer.succeed(ActivityConfig, config)),
        Effect.provide(Layer.succeed(Redis.Redis, redis)),
      ),
    );

    expect(before).toEqual([Permission.ADMIN]);
    expect(after).toEqual([]);
  });
});
