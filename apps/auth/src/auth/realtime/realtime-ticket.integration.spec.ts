import { expect, test } from "bun:test";
import { BunRedis } from "@effect/platform-bun";
import { ManagedRuntime } from "effect";
import { Redis } from "effect/unstable/persistence";
import {
  consumeRealtimeTicket,
  issueRealtimeTicket,
} from "#src/auth/realtime/realtime-ticket";

const redisPort = Number(process.env.LOOTLOG_REALTIME_TEST_REDIS_PORT ?? 0);
const integrationTest = redisPort > 0 ? test : test.skip;
const keyPattern = "auth:realtime-ticket:*";

integrationTest(
  "real Redis enforces realtime ticket reuse, origin and expiry",
  async () => {
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
  },
);
