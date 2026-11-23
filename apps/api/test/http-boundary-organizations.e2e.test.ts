import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "bun:test";
import type { ApiDatabaseValue } from "../src/database/drizzle/database.js";
import type { RedisService } from "#src/redis/redis.service";
import { Effect } from "effect";
import { and, eq } from "drizzle-orm";
import { getCompleteUserGuildsCacheKey } from "#src/discord/discord-cache.util";
import {
  guildTable,
  memberTable,
} from "../src/database/drizzle/organization.schema.js";
import {
  authorizedGuildId,
  caller,
  forbiddenGuildId,
  makeHttpBoundaryFixture,
} from "./http-boundary-fixtures.js";

const fixture = makeHttpBoundaryFixture();

const { boundary, request, databaseRuntime } = fixture;

let database: ApiDatabaseValue;

let redis: RedisService;

describe("API HTTP boundary Organizations", () => {
  beforeAll(async () => {
    ({ database, redis } = await fixture.connect());
  });

  beforeEach(fixture.reset);

  afterAll(fixture.close);

  it.each(["", "/permissions"])(
    "returns 404 for missing Organization metadata %s",
    async (suffix) => {
      const response = await request(`/guilds/missing-organization${suffix}`);
      expect(response.status).toBe(404);
    },
  );

  it("serves the Organization list from a cached Discord guild list without deactivating members", async () => {
    await Effect.runPromise(
      redis.set(
        getCompleteUserGuildsCacheKey(caller),
        JSON.stringify({
          guilds: [{ id: authorizedGuildId, name: "Authorized Organization" }],
          fetchedAt: Date.now() - 10 * 60_000,
        }),
        60,
      ),
    );

    const cached = await request("/users/@me/guilds");

    expect(cached.status).toBe(200);
    expect(await cached.json()).toEqual([
      expect.objectContaining({
        id: authorizedGuildId,
        isAccessDataStale: false,
      }),
    ]);
    expect(
      await databaseRuntime.runPromise(
        database
          .select({ active: memberTable.active })
          .from(memberTable)
          .where(eq(memberTable.guildId, forbiddenGuildId)),
      ),
    ).toEqual([{ active: true }]);

    const refreshed = await request("/users/@me/guilds/refresh", {
      method: "POST",
    });

    expect(refreshed.status).toBe(500);
  });

  it("resolves canonical and current alias loot routes while rejecting a stale alias", async () => {
    const initialAlias = await request(`/guilds/${authorizedGuildId}/config`, {
      method: "PATCH",
      body: JSON.stringify({ vanityUrl: "previous-loot-alias" }),
    });

    expect(initialAlias.status).toBe(200);
    expect((await request("/guilds/previous-loot-alias/loots")).status).toBe(
      200,
    );

    const renamed = await request(`/guilds/${authorizedGuildId}/config`, {
      method: "PATCH",
      body: JSON.stringify({ vanityUrl: "current-loot-alias" }),
    });

    expect(renamed.status).toBe(200);

    for (const guildId of [authorizedGuildId, "current-loot-alias"]) {
      const list = await request(`/guilds/${guildId}/loots`);
      expect(list.status).toBe(200);
      expect(await list.json()).toEqual({ items: [], nextCursor: null });

      const missingLoot = await request(`/guilds/${guildId}/loots/42`);
      expect(missingLoot.status).toBe(404);
    }

    const staleAlias = await request("/guilds/previous-loot-alias/loots");
    expect(staleAlias.status).toBe(404);
  });

  it("resolves an Organization id to that Organization even when another Organization's vanity URL equals it", async () => {
    await databaseRuntime.runPromise(
      database
        .update(guildTable)
        .set({ vanityUrl: authorizedGuildId })
        .where(eq(guildTable.id, forbiddenGuildId)),
    );

    const forbidden = await request(`/guilds/${forbiddenGuildId}`);
    expect(forbidden.status).toBe(403);

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const authorized = await request(`/guilds/${authorizedGuildId}`);
      expect(authorized.status).toBe(200);
      expect(await authorized.json()).toMatchObject({
        id: authorizedGuildId,
        name: "Authorized Organization",
      });
      expect((await request(`/guilds/${authorizedGuildId}/loots`)).status).toBe(
        200,
      );
    }
  });

  it("refuses to store a vanity URL that could be an Organization id", async () => {
    const stored = await databaseRuntime.runPromise(
      database
        .update(guildTable)
        .set({ vanityUrl: "123456789012345678" })
        .where(eq(guildTable.id, forbiddenGuildId))
        .pipe(
          Effect.as("stored"),
          Effect.orElseSucceed(() => "rejected"),
        ),
    );

    expect(stored).toBe("rejected");
  });

  it.each([
    ["123456789012345678", "GUILDS_VANITY_URL_INVALID"],
    ["---", "GUILDS_VANITY_URL_INVALID"],
    ["Battles!", "GUILDS_VANITY_URL_RESTRICTED"],
  ])(
    "rejects the vanity URL %p with %p without storing it",
    async (vanityUrl, code) => {
      const response = await request(`/guilds/${authorizedGuildId}/config`, {
        method: "PATCH",
        body: JSON.stringify({ vanityUrl }),
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ code });

      const [guild] = await databaseRuntime.runPromise(
        database
          .select({ vanityUrl: guildTable.vanityUrl })
          .from(guildTable)
          .where(eq(guildTable.id, authorizedGuildId)),
      );

      expect(guild?.vanityUrl).toBeNull();
    },
  );

  it("resolves the Discord bot's member identity only for an active member of that Organization", async () => {
    await databaseRuntime.runPromise(
      database
        .update(memberTable)
        .set({ active: false })
        .where(eq(memberTable.guildId, forbiddenGuildId)),
    );

    const identity = (guildId: string, discordId: string) =>
      boundary.handler(
        new Request(
          `http://api.test/internal/guilds/${guildId}/members/${discordId}/identity`,
        ),
      );

    const [member] = await databaseRuntime.runPromise(
      database
        .select({ id: memberTable.id })
        .from(memberTable)
        .where(
          and(
            eq(memberTable.guildId, authorizedGuildId),
            eq(memberTable.userId, caller.discordId),
          ),
        ),
    );

    const active = await identity(authorizedGuildId, caller.discordId);

    expect(active.status).toBe(200);
    expect(await active.json()).toEqual({
      userId: caller.userId,
      memberId: member?.id,
    });

    for (const response of await Promise.all([
      identity(forbiddenGuildId, caller.discordId),
      identity(authorizedGuildId, "discord-unknown"),
      identity("guild-unknown", caller.discordId),
    ])) {
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ code: "MEMBER_NOT_FOUND" });
    }
  });

  it.each([
    { suffix: "/members", method: "GET" },
    { suffix: "/members/references", method: "GET" },
    { suffix: "/members/summary", method: "GET" },
    { suffix: "/members/refresh-all", method: "POST" },
    { suffix: "/members/member-a/refresh", method: "POST" },
    { suffix: "/members/member-a/deactivate", method: "PATCH" },
    { suffix: "/members/member-a/lootlog-config-summary", method: "GET" },
    { suffix: "/members/refresh-jobs/latest", method: "GET" },
    { suffix: "/members/refresh-jobs/1", method: "GET" },
    { suffix: "/chat-messages", method: "GET" },
    { suffix: "/chat-messages", method: "DELETE" },
    { suffix: "/chat-messages/message-a", method: "DELETE" },
    {
      suffix: "/chat-messages",
      method: "POST",
      payload: {
        message: "Hello",
        type: "NORMAL",
        characterData: {
          nick: "Hero",
          id: 1,
          acc: 2,
          lvl: 300,
          prof: "w",
          icon: "hero.gif",
        },
      },
    },
  ])(
    "preserves Organization authorization status for $method $suffix",
    async ({ suffix, method, payload }) => {
      const init = {
        method,
        body: payload ? JSON.stringify(payload) : undefined,
      };

      const missing = await request(
        `/guilds/missing-organization${suffix}`,
        init,
      );

      const forbidden = await request(
        `/guilds/${forbiddenGuildId}${suffix}`,
        init,
      );

      expect(missing.status).toBe(404);
      expect(await missing.json()).toEqual({ code: "GUILD_NOT_FOUND" });
      expect(forbidden.status).toBe(403);
      expect(await forbidden.json()).toEqual({ code: "FORBIDDEN" });
    },
  );
});
