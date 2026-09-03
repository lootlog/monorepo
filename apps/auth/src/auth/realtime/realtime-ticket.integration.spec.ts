import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { BunRedis } from "@effect/platform-bun";
import { ManagedRuntime } from "effect";
import { Redis } from "effect/unstable/persistence";
import {
  GenericContainer,
  type StartedTestContainer,
  Wait,
} from "testcontainers";
import {
  consumeRealtimeTicket,
  issueRealtimeTicket,
} from "#src/auth/realtime/realtime-ticket";

const keyPattern = "auth:realtime-ticket:*";
let dragonfly: StartedTestContainer;
let redisPort: number;

describe("realtime ticket storage integration", () => {
  beforeAll(async () => {
    dragonfly = await new GenericContainer(
      "docker.dragonflydb.io/dragonflydb/dragonfly:v1.34.1",
    )
      .withCommand(["--logtostderr", "--proactor_threads=2"])
      .withExposedPorts(6379)
      .withWaitStrategy(Wait.forListeningPorts())
      .withStartupTimeout(60_000)
      .start();
    redisPort = dragonfly.getMappedPort(6379);
  }, 60_000);

  afterAll(async () => {
    await dragonfly?.stop();
  });

  test("Dragonfly enforces realtime ticket reuse, origin and expiry", async () => {
    const runtime = ManagedRuntime.make(
      BunRedis.layer({ url: `redis://127.0.0.1:${redisPort}`, maxRetries: 1 }),
    );
    const service = await runtime.runPromise(Redis.Redis);
    const command = <A>(name: string, ...args: string[]) =>
      runtime.runPromise(service.send<A>(name, ...args));
    const redis = {
      set: (
        key: string,
        value: string,
        mode: "EX",
        ttl: number,
        condition: "NX",
      ) => command("SET", key, value, mode, String(ttl), condition),
      getdel: (key: string) => command<string | null>("GETDEL", key),
    };
    try {
      const existingKeys = await command<string[]>("KEYS", keyPattern);
      if (existingKeys.length > 0) await command("DEL", ...existingKeys);

      const first = await issueRealtimeTicket(
        redis,
        { userId: "user-1", discordId: "discord-1" },
        "https://classic.margonem.pl",
      );
      await expect(
        consumeRealtimeTicket(
          redis,
          first.ticket,
          "https://classic.margonem.pl",
        ),
      ).resolves.toEqual({ userId: "user-1", discordId: "discord-1" });
      await expect(
        consumeRealtimeTicket(
          redis,
          first.ticket,
          "https://classic.margonem.pl",
        ),
      ).resolves.toBeNull();

      const wrongOrigin = await issueRealtimeTicket(
        redis,
        { userId: "user-1", discordId: "discord-1" },
        "https://classic.margonem.pl",
      );
      await expect(
        consumeRealtimeTicket(
          redis,
          wrongOrigin.ticket,
          "https://attacker.example",
        ),
      ).resolves.toBeNull();
      await expect(
        consumeRealtimeTicket(
          redis,
          wrongOrigin.ticket,
          "https://classic.margonem.pl",
        ),
      ).resolves.toBeNull();

      const expiring = await issueRealtimeTicket(
        redis,
        { userId: "user-1", discordId: "discord-1" },
        "https://classic.margonem.pl",
      );
      const [expiringKey] = await command<string[]>("KEYS", keyPattern);
      if (!expiringKey) throw new Error("Expected persisted realtime ticket");
      await command("PEXPIRE", expiringKey, "50");
      await Bun.sleep(80);
      await expect(
        consumeRealtimeTicket(
          redis,
          expiring.ticket,
          "https://classic.margonem.pl",
        ),
      ).resolves.toBeNull();
    } finally {
      const keys = await command<string[]>("KEYS", keyPattern);
      if (keys.length > 0) await command("DEL", ...keys);
      await runtime.dispose();
    }
  });
});
