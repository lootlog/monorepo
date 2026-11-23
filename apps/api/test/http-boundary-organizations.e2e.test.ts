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
import { CHAT_MESSAGE_LIMIT } from "@lootlog/schema/chat";
import { eq } from "drizzle-orm";
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

const CHAT_HISTORY_BYTE_BUDGET = 310_000;

const fixture = makeHttpBoundaryFixture();

const { request, databaseRuntime } = fixture;

let database: ApiDatabaseValue;

let redis: RedisService;

describe("API HTTP boundary Organizations", () => {
  beforeAll(async () => {
    ({ database, redis } = await fixture.connect());
  });

  beforeEach(fixture.reset);

  afterAll(fixture.close);

  it("caps the Organization chat history the game client loads at startup and keeps it under its byte budget, so a lost trim or per-message bloat fails", async () => {
    const send = (index: number) =>
      request(`/guilds/${authorizedGuildId}/chat-messages`, {
        method: "POST",
        body: JSON.stringify({
          message: `${index} `.padEnd(128, "ą"),
          type: "NORMAL",
          characterData: {
            nick: "Waćpan Gremi",
            id: 8_123_456,
            acc: 9_123_456,
            lvl: 287,
            prof: "w",
            icon: "/eve/w22-wojo-m1.gif",
          },
          replyTo: {
            messageId: crypto.randomUUID(),
            senderNick: "zbujnik patryk",
            message: "".padEnd(128, "ę"),
            type: "NORMAL",
          },
        }),
      });

    for (let index = 0; index < CHAT_MESSAGE_LIMIT + 20; index++)
      expect((await send(index)).status).toBe(201);

    const response = await request(
      `/guilds/${authorizedGuildId}/chat-messages`,
    );

    const body = await response.text();

    const messages: ReadonlyArray<{ message: string }> = JSON.parse(body);

    expect(response.status).toBe(200);
    expect(messages).toHaveLength(CHAT_MESSAGE_LIMIT);
    expect(messages[0]?.message).toStartWith("20 ");
    expect(Buffer.byteLength(body)).toBeLessThanOrEqual(
      CHAT_HISTORY_BYTE_BUDGET,
    );
  });

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

    expect(refreshed.status).toBe(200);
    expect(await refreshed.json()).toEqual([
      expect.objectContaining({
        id: authorizedGuildId,
        isAccessDataStale: true,
      }),
    ]);
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
