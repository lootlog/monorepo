import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "bun:test";
import { ReauthenticationRequired } from "@lootlog/protocol/http/errors";
import { RpcUnauthorizedError } from "@lootlog/rpc/errors";
import { Effect, Layer, Schema } from "effect";
import { and, eq } from "drizzle-orm";
import { InternalGuildsData } from "#src/guilds/internal-guilds-data";
import { ApiDatabase } from "../src/database/drizzle/database.js";
import { memberTable } from "../src/database/drizzle/organization.schema.js";
import {
  authorizedGuildId,
  caller,
  createHttpBoundaryContext,
  forbiddenGuildId,
  headers,
  world,
} from "./http-boundary.e2e.fixtures.js";

describe("API HTTP boundary - access and auth", () => {
  const ctx = createHttpBoundaryContext();

  beforeAll(() => ctx.setup());
  beforeEach(() => ctx.reset());
  afterAll(() => ctx.teardown());

  it.each(["", "/permissions"])(
    "returns 404 for missing Organization metadata %s",
    async (suffix) => {
      const response = await ctx.request(
        `/guilds/missing-organization${suffix}`,
      );

      expect(response.status).toBe(404);
    },
  );

  it("enforces Organization access for events and notifications", async () => {
    const responses = await Promise.all([
      ctx.request(`/guilds/${authorizedGuildId}/events`),
      ctx.request(`/guilds/${forbiddenGuildId}/events`),
      ctx.request(`/guilds/${authorizedGuildId}/notifications/targets`),
      ctx.request(`/guilds/${forbiddenGuildId}/notifications/targets`),
      ctx.request("/users/@me/notifications/targets"),
      ctx.rawRequest(
        new Request("http://api.test/users/@me/notifications/targets", {
          headers: { authorization: headers.authorization },
        }),
      ),
    ]);

    expect(responses.map(({ status }) => status)).toEqual([
      200, 403, 200, 403, 200, 401,
    ]);
  });

  it("resolves the Discord bot's member identity only for an active member of that Organization", async () => {
    await ctx.databaseRuntime.runPromise(
      ctx.database
        .update(memberTable)
        .set({ active: false })
        .where(eq(memberTable.guildId, forbiddenGuildId)),
    );

    const internalGuildsLayer = InternalGuildsData.layerDatabase({
      ...ctx.redis,
      getOrSetJsonEffect: ctx.redis.getOrSetJson,
    }).pipe(Layer.provide(Layer.succeed(ApiDatabase, ctx.database)));

    const identity = (guildId: string, discordId: string) =>
      Effect.runPromise(
        Effect.flatMap(InternalGuildsData, (data) =>
          data.getMemberIdentity(guildId, discordId),
        ).pipe(Effect.provide(internalGuildsLayer)),
      );

    const [member] = await ctx.databaseRuntime.runPromise(
      ctx.database
        .select({ id: memberTable.id })
        .from(memberTable)
        .where(
          and(
            eq(memberTable.guildId, authorizedGuildId),
            eq(memberTable.userId, caller.discordId),
          ),
        ),
    );

    if (!member) {
      throw new Error("Expected active member record");
    }

    const active = await identity(authorizedGuildId, caller.discordId);

    expect(active).toEqual({
      userId: caller.userId,
      memberId: member.id,
    });

    for (const resolved of await Promise.all([
      identity(forbiddenGuildId, caller.discordId),
      identity(authorizedGuildId, "discord-unknown"),
      identity("guild-unknown", caller.discordId),
    ])) {
      expect(resolved).toBeNull();
    }
  });

  it("preserves expected 4xx statuses at the HTTP boundary", async () => {
    const missingTemplate = await ctx.request(
      `/guilds/${authorizedGuildId}/map-templates/missing-template`,
      {
        method: "PUT",
        body: JSON.stringify({
          name: "Missing route",
          maps: [{ id: 1, name: "Ithan" }],
        }),
      },
    );

    const forbiddenHistory = await ctx.request(
      `/guilds/${forbiddenGuildId}/timers/missing-timer/history?world=${world}`,
    );

    expect(missingTemplate.status).toBe(404);
    expect(forbiddenHistory.status).toBe(403);
  });

  it.each([
    {
      code: "DISCORD_UNAUTHORIZED",
      reason: "Discord rejected their token",
      arrange: () => ctx.issueRevokedDiscordToken(caller),
    },
    {
      code: "TOKEN_EXPIRED",
      reason: "their Discord token expired",
      arrange: () => {
        ctx.setAuthServiceAnswer(() =>
          Effect.fail(new RpcUnauthorizedError({ message: "TOKEN_EXPIRED" })),
        );
      },
    },
  ])(
    "asks the caller to sign in again when $reason",
    async ({ code, arrange }) => {
      await ctx.databaseRuntime.runPromise(
        ctx.database
          .update(memberTable)
          .set({
            lastDiscordSyncAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          })
          .where(eq(memberTable.guildId, authorizedGuildId)),
      );
      await arrange();

      for (const path of [
        "/members/@me",
        "/events",
        `/timers/missing-timer/history?world=${world}`,
      ]) {
        const response = await ctx.request(
          `/guilds/${authorizedGuildId}${path}`,
        );

        expect(response.status).toBe(401);
        expect(await response.json()).toEqual(
          Schema.encodeSync(ReauthenticationRequired)(
            new ReauthenticationRequired({ code, requiresReauth: true }),
          ),
        );
      }
    },
  );

  it("keeps an admin signed in when another member's Discord authorization fails", async () => {
    const other = { userId: "user-2", discordId: "discord-2" };

    await ctx.databaseRuntime.runPromise(
      ctx.database.insert(memberTable).values({
        userId: other.discordId,
        globalUserId: other.userId,
        guildId: authorizedGuildId,
        name: "Member with expired Discord authorization",
        lastDiscordSyncAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
      }),
    );
    await ctx.issueRevokedDiscordToken(other);

    const response = await ctx.request(
      `/guilds/${authorizedGuildId}/members/${other.discordId}/refresh`,
      { method: "POST" },
    );

    expect(response.status).not.toBe(401);
    expect(response.status).toBeLessThan(500);
  });

  it.each([
    { path: "/map-templates", field: "name" },
    { path: "/events", field: "name" },
  ])(
    "rejects an invalid POST $path payload as a validation error regardless of declared errors",
    async ({ path, field }) => {
      const response = await ctx.request(
        `/guilds/${authorizedGuildId}${path}`,
        {
          method: "POST",
          body: JSON.stringify({}),
        },
      );

      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({
        code: "VALIDATION_ERROR",
        message: expect.stringContaining(field),
        details: {
          issues: expect.arrayContaining([
            expect.objectContaining({ path: [field] }),
          ]),
        },
      });
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

      const missing = await ctx.request(
        `/guilds/missing-organization${suffix}`,
        init,
      );

      const forbidden = await ctx.request(
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
