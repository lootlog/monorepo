import { describe, expect, test } from "bun:test";
import { BunRedis } from "@effect/platform-bun";
import { Effect, Queue, Schedule } from "effect";
import { Redis } from "effect/persistence";
import { RealtimeHub } from "#src/realtime/realtime-hub";
import { dragonflyUrl, useDragonfly } from "./dragonfly-fixtures.js";
import {
  makeConfiguration,
  feedSocket,
  lootFeed,
  openStore,
  startFederatedInstance,
  waitFor,
} from "./realtime-redis-fixtures.js";

describe("realtime Dragonfly integration: redis subscriptions", () => {
  useDragonfly();

  test("closing a subscription scope releases Redis without a shutdown defect", async () => {
    const channel = `shutdown:${crypto.randomUUID()}`;
    await Effect.runPromise(
      Effect.gen(function* () {
        const redis = yield* Redis.Redis;
        yield* Effect.scoped(
          Effect.gen(function* () {
            const messages = yield* redis.subscribe(channel);
            yield* redis.send("PUBLISH", channel, "before shutdown");
            expect(yield* Queue.take(messages)).toEqual({
              channel,
              message: "before shutdown",
            });
          }),
        );

        const subscriptions = yield* redis
          .send<[string, number]>("PUBSUB", "NUMSUB", channel)
          .pipe(
            Effect.repeat({
              until: ([, count]) => count === 0,
              schedule: Schedule.spaced("10 millis"),
            }),
          );

        expect(subscriptions).toEqual([channel, 0]);
        expect(yield* redis.send("PING")).toBe("PONG");
      }).pipe(
        Effect.provide(BunRedis.layer({ url: dragonflyUrl() })),
        Effect.timeout("5 seconds"),
      ),
    );
  });

  test("SIGINT shuts down an active Redis subscription without logging a defect", async () => {
    const child = Bun.spawn(
      [
        process.execPath,
        "--eval",
        `
          import { BunRedis, BunRuntime } from "@effect/platform-bun";
          import { Effect } from "effect";
          import { Redis } from "effect/persistence";
          BunRuntime.runMain(Effect.gen(function* () {
            const redis = yield* Redis.Redis;
            yield* redis.subscribe("shutdown:signal");
            console.log("subscribed");
            yield* Effect.never;
          }).pipe(Effect.scoped, Effect.provide(BunRedis.layer({ url: ${JSON.stringify(dragonflyUrl())} }))));
        `,
      ],
      {
        cwd: `${import.meta.dirname}/..`,
        stdout: "pipe",
        stderr: "pipe",
        timeout: 5_000,
        killSignal: "SIGKILL",
      },
    );

    const reader = child.stdout.getReader();
    const errors = new Response(child.stderr).text();

    try {
      const ready = await reader.read();
      expect(new TextDecoder().decode(ready.value)).toContain("subscribed");
      child.kill("SIGINT");
      expect(await child.exited).toBe(130);
      expect(await errors).toBe("");
    } finally {
      reader.releaseLock();
      child.kill();
      await child.exited;
    }
  }, 10_000);

  test.each([
    { lostFrame: false, closed: false },
    { lostFrame: true, closed: true },
  ] as const)(
    "a dropped federation subscription closes sessions only when frames may be lost (lost frame: $lostFrame)",
    async ({ lostFrame, closed }) => {
      const configuration = makeConfiguration();
      await using control = await openStore(configuration.redis.keyPrefix);

      const subscriberAddresses = async () =>
        new Set(
          (
            await control.runtime.runPromise(
              control.redis.send<string>("CLIENT", "LIST"),
            )
          )
            .split("\n")
            .filter((client) => /\bflags=P\b/.test(client))
            .flatMap((client) => client.match(/\baddr=(\S+)/)?.[1] ?? []),
        );

      const follow = (hub: RealtimeHub, connectionId: string) => {
        const target = feedSocket(connectionId);
        const closes: Array<{ code?: number; reason?: string }> = [];

        target.socket.close = (code?: number) => {
          closes.push({ code, reason: hub.unavailableReason() });
        };

        hub.register(target.socket);
        hub.subscribe(target.socket, lootFeed);

        return { ...target, closes };
      };

      const publishKill = (hub: RealtimeHub) =>
        hub.publishToScope(
          lootFeed,
          { v: 1, type: "kills.changed", data: { guildId: "organization-1" } },
          crypto.randomUUID(),
          {
            recipientPlatform: "web-app",
            sourceNpcs: [{ level: 100, type: "HERO" }],
          },
        );

      const before = await subscriberAddresses();
      await using affected = await startFederatedInstance(configuration);

      const [affectedSubscriber] = [...(await subscriberAddresses())].filter(
        (address) => !before.has(address),
      );

      if (!affectedSubscriber)
        throw new Error("Affected subscriber connection not found");
      await using healthy = await startFederatedInstance(configuration);
      const stale = follow(affected.hub, "stale");
      await publishKill(healthy.hub);
      await waitFor(() => stale.frames.length === 1);

      if (lostFrame)
        await control.runtime.runPromise(
          control.redis.send(
            "INCR",
            `${configuration.redis.keyPrefix}:realtime:federation:v1:sequence`,
          ),
        );
      const subscribed = (await subscriberAddresses()).size;
      await control.runtime.runPromise(
        control.redis.send("CLIENT", "KILL", affectedSubscriber),
      );

      if (closed) {
        await waitFor(() => stale.closes.length === 1, 5_000);
        expect(stale.closes).toEqual([
          { code: 1013, reason: "federation-unavailable" },
        ]);
        expect(affected.hub.getLocalSockets()).toEqual([]);
        expect(stale.socket.data.closing).toBe(true);
      }

      await waitFor(async () => {
        const addresses = await subscriberAddresses();

        return (
          !addresses.has(affectedSubscriber) && addresses.size >= subscribed
        );
      }, 5_000);
      await waitFor(
        () => affected.hub.unavailableReason() === undefined,
        5_000,
      );
      const current = follow(affected.hub, "current");
      await publishKill(healthy.hub);
      await waitFor(() => current.frames.length === 1);

      if (closed) {
        expect(stale.frames).toHaveLength(1);
        expect(stale.closes).toHaveLength(1);
      } else {
        await waitFor(() => stale.frames.length === 2);
        expect(stale.closes).toEqual([]);
      }
    },
  );
});
