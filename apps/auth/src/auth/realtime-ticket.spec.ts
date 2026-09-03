import { describe, expect, it } from "bun:test";
import {
  consumeRealtimeTicket,
  issueRealtimeTicket,
  REALTIME_TICKET_TTL_SECONDS,
  type RealtimeTicketRedis,
} from "./realtime-ticket.js";

class FakeRedis implements RealtimeTicketRedis {
  readonly values = new Map<string, string>();
  ttl = 0;
  set(key: string, value: string, _mode: "EX", ttl: number): Promise<string> {
    this.values.set(key, value);
    this.ttl = ttl;
    return Promise.resolve("OK");
  }
  getdel(key: string): Promise<string | null> {
    const value = this.values.get(key) ?? null;
    this.values.delete(key);
    return Promise.resolve(value);
  }
}

describe("realtime tickets", () => {
  it("stores only a SHA-256 lookup key and consumes the ticket exactly once", async () => {
    const redis = new FakeRedis();
    const issued = await issueRealtimeTicket(
      redis,
      { userId: "user-1", discordId: "discord-1" },
      "https://classic.margonem.pl",
      () => 1_000,
    );
    expect(issued.expiresAt).toBe(31_000);
    expect(redis.ttl).toBe(REALTIME_TICKET_TTL_SECONDS);
    const [key] = redis.values.keys();
    expect(key).toMatch(/^auth:realtime-ticket:[a-f0-9]{64}$/);
    expect(key).not.toContain(issued.ticket);
    await expect(
      consumeRealtimeTicket(
        redis,
        issued.ticket,
        "https://classic.margonem.pl",
      ),
    ).resolves.toEqual({ userId: "user-1", discordId: "discord-1" });
    await expect(
      consumeRealtimeTicket(
        redis,
        issued.ticket,
        "https://classic.margonem.pl",
      ),
    ).resolves.toBeNull();
  });

  it("consumes and rejects a ticket presented from another origin", async () => {
    const redis = new FakeRedis();
    const { ticket } = await issueRealtimeTicket(
      redis,
      { userId: "user-1", discordId: "discord-1" },
      "https://classic.margonem.pl",
    );
    await expect(
      consumeRealtimeTicket(redis, ticket, "https://attacker.example"),
    ).resolves.toBeNull();
    await expect(
      consumeRealtimeTicket(redis, ticket, "https://classic.margonem.pl"),
    ).resolves.toBeNull();
  });

  it("consumes and rejects a ticket whose stored identity violates the schema", async () => {
    const redis = new FakeRedis();
    const { ticket } = await issueRealtimeTicket(
      redis,
      { userId: "user-1", discordId: "discord-1" },
      "https://classic.margonem.pl",
    );
    const [key] = redis.values.keys();
    redis.values.set(
      key ?? "missing",
      JSON.stringify({
        userId: "user-1",
        discordId: 42,
        origin: "https://classic.margonem.pl",
      }),
    );

    await expect(
      consumeRealtimeTicket(redis, ticket, "https://classic.margonem.pl"),
    ).resolves.toBeNull();
    expect(redis.values.size).toBe(0);
  });

  it("cannot consume a ticket after the requested Redis TTL", async () => {
    let now = 0;
    let stored: { key: string; value: string; expiresAt: number } | null = null;
    const redis: RealtimeTicketRedis = {
      set: (key, value, _mode, ttl) => {
        stored = { key, value, expiresAt: now + ttl * 1_000 };
        return Promise.resolve("OK");
      },
      getdel: (key) => {
        const current = stored;
        stored = null;
        if (!current || current.key !== key || current.expiresAt <= now) {
          return Promise.resolve(null);
        }
        return Promise.resolve(current.value);
      },
    };
    const { ticket } = await issueRealtimeTicket(
      redis,
      { userId: "user-1", discordId: "discord-1" },
      "https://classic.margonem.pl",
      () => now,
    );
    now = REALTIME_TICKET_TTL_SECONDS * 1_000 + 1;
    await expect(
      consumeRealtimeTicket(redis, ticket, "https://classic.margonem.pl"),
    ).resolves.toBeNull();
  });
});
