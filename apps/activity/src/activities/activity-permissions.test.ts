import { describe, expect, it } from "bun:test";
import { ApiRpcGroup } from "@lootlog/rpc/api";
import { makeRpcTestHttpClient, testRpcUpstream } from "@lootlog/rpc/testing";
import { Capability } from "@lootlog/schema/permissions";
import { RuntimeEnvironment } from "@lootlog/schema/runtime-environment";
import { Effect, Layer, Queue, Redacted } from "effect";
import { Redis } from "effect/persistence";
import { ActivityConfig } from "#src/config/activity-config";
import { Permissions } from "./activity-permissions.js";

const unused = () => Effect.die("unused");

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
            permissions: [Capability.ADMIN],
          },
        ],
      },
    ];

    const responses = [adminGrant, []];

    const apiRpcHandlers = ApiRpcGroup.toLayer({
      getUserGuildPermissions: () => Effect.succeed(responses.shift() ?? []),
      getGuildByIdOrVanityUrl: unused,
      getMemberIdentity: unused,
      getUserAccessibleGuilds: unused,
      listGuildEvents: unused,
      getEventRanking: unused,
      getEventTimers: unused,
      getEventWrapped: unused,
      listGuildTimers: unused,
      getGuildKillStats: unused,
      getGuildTopKilledNpcs: unused,
      getNpcKillers: unused,
      listGuildLoots: unused,
      listUserReservations: unused,
      listGuildReservationSpots: unused,
    });

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
      reserve: Effect.die("unused"),
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
      apiRpc: testRpcUpstream,
      signatureSecret: Redacted.make("a".repeat(32)),
    });

    const read = Effect.flatMap(Permissions, (service) =>
      service
        .getUserCapabilities("discord-1", "user-1")
        .pipe(Effect.map((capabilitiesFor) => capabilitiesFor("guild-1"))),
    );

    const [before, after] = await Effect.runPromise(
      Effect.all([read, read]).pipe(
        Effect.provide(
          Layer.provide(
            Permissions.layer,
            makeRpcTestHttpClient(ApiRpcGroup, apiRpcHandlers, ["activity"]),
          ),
        ),
        Effect.provideService(ActivityConfig, config),
        Effect.provideService(Redis.Redis, redis),
      ),
    );

    expect(before).toEqual([Capability.ADMIN]);
    expect(after).toEqual([]);
  });
});
