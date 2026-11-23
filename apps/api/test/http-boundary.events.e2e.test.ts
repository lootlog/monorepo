import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "bun:test";
import { Permission } from "@lootlog/schema/permissions";
import { Effect } from "effect";
import { eq } from "drizzle-orm";
import { getPermissionsCacheKey } from "#src/shared/cache";
import {
  eventHeroKillTable,
  eventHeroNpcTable,
  eventKillPointTable,
  eventTable,
} from "../src/database/drizzle/event.schema.js";
import {
  guildTable,
  memberTable,
  roleTable,
} from "../src/database/drizzle/organization.schema.js";
import {
  authorizedGuildId,
  caller,
  createHttpBoundaryContext,
  forbiddenGuildId,
  world,
} from "./http-boundary.e2e.fixtures.js";

describe("API HTTP boundary - events and vanity routes", () => {
  const ctx = createHttpBoundaryContext();

  beforeAll(() => ctx.setup());
  beforeEach(() => ctx.reset());
  afterAll(() => ctx.teardown());

  const seedKillHistory = async () => {
    const highKill = "eeeeeeee-1111-4111-8111-111111111111";
    const newestLowKill = "ffffffff-1111-4111-8111-111111111111";
    const oldestLowKill = "aaaaaaaa-1111-4111-8111-111111111111";
    const foreignKill = "dddddddd-1111-4111-8111-111111111111";
    const now = new Date();

    const members = await ctx.databaseRuntime.runPromise(
      ctx.database
        .select({ id: memberTable.id })
        .from(memberTable)
        .where(eq(memberTable.guildId, authorizedGuildId)),
    );

    const memberId = members[0]?.id;

    if (memberId === undefined) throw new Error("Expected authorized member");
    await ctx.databaseRuntime.runPromise(
      Effect.gen(function* () {
        yield* ctx.database.insert(eventTable).values([
          {
            id: "history",
            guildId: authorizedGuildId,
            name: "History",
            world,
            updatedAt: now,
          },
          {
            id: "foreign-history",
            guildId: forbiddenGuildId,
            name: "Foreign history",
            world,
            updatedAt: now,
          },
        ]);
        yield* ctx.database.insert(eventHeroNpcTable).values([
          {
            id: "low-hero",
            eventId: "history",
            npcName: "Low hero",
            npcLvl: 50,
          },
          {
            id: "high-hero",
            eventId: "history",
            npcName: "High hero",
            npcLvl: 300,
          },
          {
            id: "foreign-hero",
            eventId: "foreign-history",
            npcName: "Foreign hero",
            npcLvl: 50,
          },
        ]);
        yield* ctx.database.insert(eventHeroKillTable).values(
          [
            {
              id: highKill,
              heroNpcId: "high-hero",
              killedAt: new Date("2026-09-27T12:00:00Z"),
            },
            {
              id: newestLowKill,
              heroNpcId: "low-hero",
              killedAt: new Date("2026-09-27T11:00:00Z"),
            },
            {
              id: oldestLowKill,
              heroNpcId: "low-hero",
              killedAt: new Date("2026-09-27T10:00:00Z"),
            },
            {
              id: foreignKill,
              heroNpcId: "foreign-hero",
              killedAt: new Date("2026-09-27T13:00:00Z"),
            },
          ].map((kill) => ({
            ...kill,
            minSpawnTimeAtKill: new Date("2026-09-27T09:00:00Z"),
            maxSpawnTimeAtKill: new Date("2026-09-27T14:00:00Z"),
          })),
        );
        yield* ctx.database.insert(eventKillPointTable).values(
          [highKill, newestLowKill, oldestLowKill].map((killId) => ({
            id: `point-${killId}`,
            killId,
            memberId,
            basePoints: 1,
            points: 4.25,
            timeOnMapSeconds: 60,
            afkPercentage: 0,
            wasPresent: false,
          })),
        );
      }),
    );

    return { memberId, highKill, newestLowKill, oldestLowKill, foreignKill };
  };

  it("serves scoped kill summaries through the deployed HTTP contracts", async () => {
    const { memberId, highKill, newestLowKill, oldestLowKill, foreignKill } =
      await seedKillHistory();

    const base = `/guilds/${authorizedGuildId}/events/history`;
    const first = await ctx.request(`${base}/kill-history?limit=1`);
    expect(first.status).toBe(200);
    const firstPage = await first.json();
    expect(firstPage).toMatchObject({
      kind: "event",
      items: [{ id: highKill, participantCount: 1 }],
    });
    expect(firstPage.items[0]).not.toHaveProperty("points");

    const continuation = await ctx.request(
      `${base}/kill-history?limit=2&cursor=${encodeURIComponent(firstPage.nextCursor)}`,
    );

    expect(continuation.status).toBe(200);
    expect(await continuation.json()).toMatchObject({
      items: [{ id: newestLowKill }, { id: oldestLowKill }],
      nextCursor: null,
    });

    const member = await ctx.request(
      `${base}/kill-history?memberId=${memberId}&heroId=low-hero`,
    );

    expect(member.status).toBe(200);
    expect(await member.json()).toMatchObject({
      kind: "member",
      member: { id: memberId },
      items: [
        { id: newestLowKill, memberPoint: { points: 4.25 } },
        { id: oldestLowKill },
      ],
    });

    for (const query of [
      "limit=0",
      "limit=101",
      "limit=1.5",
      "cursor=invalid",
      `cursor=${encodeURIComponent(firstPage.nextCursor)}&heroId=low-hero`,
    ]) {
      expect((await ctx.request(`${base}/kill-history?${query}`)).status).toBe(
        400,
      );
    }

    expect(
      (await ctx.request(`${base}/heroes/low-hero/kills/${foreignKill}`))
        .status,
    ).toBe(404);
    expect(
      (
        await ctx.request(
          `${base}/heroes/low-hero/kills/${foreignKill}/timeline`,
        )
      ).status,
    ).toBe(404);
  });

  it("rechecks history access after cache warmup, level changes and permission loss", async () => {
    const { highKill, newestLowKill, oldestLowKill } = await seedKillHistory();
    const base = `/guilds/${authorizedGuildId}/events/history`;
    expect(
      await (await ctx.request(`${base}/kill-history`)).json(),
    ).toMatchObject({
      items: [{ id: highKill }, { id: newestLowKill }, { id: oldestLowKill }],
    });

    const setAccess = async (permissions: Permission[], maximum: number) => {
      await ctx.databaseRuntime.runPromise(
        ctx.database
          .update(roleTable)
          .set({ permissions, lvlRangeFrom: 1, lvlRangeTo: maximum })
          .where(eq(roleTable.id, "timer-maintainer")),
      );
      await Effect.runPromise(
        ctx.redis.del(getPermissionsCacheKey(caller.userId, authorizedGuildId)),
      );
    };

    await setAccess([Permission.LOOTLOG_EVENTS_READ], 100);
    expect(
      await (await ctx.request(`${base}/kill-history`)).json(),
    ).toMatchObject({
      items: [{ id: newestLowKill }, { id: oldestLowKill }],
    });
    expect(
      (await ctx.request(`${base}/kill-history?heroId=high-hero`)).status,
    ).toBe(404);
    expect(
      (await ctx.request(`${base}/heroes/high-hero/kills/${highKill}`)).status,
    ).toBe(404);
    expect(
      (await ctx.request(`${base}/heroes/high-hero/kills/${highKill}/timeline`))
        .status,
    ).toBe(404);
    await setAccess([Permission.LOOTLOG_EVENTS_READ], 20);
    expect(
      await (await ctx.request(`${base}/kill-history`)).json(),
    ).toMatchObject({
      items: [],
      nextCursor: null,
    });
    await setAccess([], 100);
    expect((await ctx.request(`${base}/kill-history`)).status).toBe(403);
  });

  it("keeps read-only API key kill history inside its Organization scope", async () => {
    const { newestLowKill, oldestLowKill } = await seedKillHistory();
    const keyGuildId = "123456789012345678";
    const otherKeyGuildId = "987654321098765432";
    await ctx.databaseRuntime.runPromise(
      Effect.gen(function* () {
        yield* ctx.database
          .update(guildTable)
          .set({ id: keyGuildId })
          .where(eq(guildTable.id, authorizedGuildId));
        yield* ctx.database
          .update(guildTable)
          .set({ id: otherKeyGuildId })
          .where(eq(guildTable.id, forbiddenGuildId));
      }),
    );

    const apiKeyHeaders = (organizationIds: string[]) => ({
      "x-auth-api-key-access": JSON.stringify({
        keyId: "history-key",
        organizationIds,
        mode: "read",
        personalData: false,
        expiresAt: null,
      }),
    });

    const allowed = await ctx.request(
      `/guilds/${keyGuildId}/events/history/kill-history?heroId=low-hero`,
      { headers: apiKeyHeaders([keyGuildId]) },
    );

    expect(allowed.status).toBe(200);
    expect(await allowed.json()).toMatchObject({
      items: [{ id: newestLowKill }, { id: oldestLowKill }],
    });
    expect(
      (
        await ctx.request(`/guilds/${keyGuildId}/events/history/kill-history`, {
          headers: apiKeyHeaders([otherKeyGuildId]),
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await ctx.request(
          `/guilds/${keyGuildId}/events/foreign-history/kill-history`,
          { headers: apiKeyHeaders([keyGuildId]) },
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await ctx.request(
          `/guilds/${otherKeyGuildId}/events/foreign-history/kill-history`,
          { headers: apiKeyHeaders([keyGuildId]) },
        )
      ).status,
    ).toBe(403);
  });

  it("resolves canonical and current alias loot routes while rejecting a stale alias", async () => {
    const initialAlias = await ctx.request(
      `/guilds/${authorizedGuildId}/config`,
      {
        method: "PATCH",
        body: JSON.stringify({ vanityUrl: "previous-loot-alias" }),
      },
    );

    expect(initialAlias.status).toBe(200);
    expect(
      (await ctx.request("/guilds/previous-loot-alias/loots")).status,
    ).toBe(200);

    const renamed = await ctx.request(`/guilds/${authorizedGuildId}/config`, {
      method: "PATCH",
      body: JSON.stringify({ vanityUrl: "current-loot-alias" }),
    });

    expect(renamed.status).toBe(200);

    for (const guildId of [authorizedGuildId, "current-loot-alias"]) {
      const list = await ctx.request(`/guilds/${guildId}/loots`);
      expect(list.status).toBe(200);
      expect(await list.json()).toEqual({ items: [], nextCursor: null });

      const missingLoot = await ctx.request(`/guilds/${guildId}/loots/42`);
      expect(missingLoot.status).toBe(404);
    }

    const staleAlias = await ctx.request("/guilds/previous-loot-alias/loots");
    expect(staleAlias.status).toBe(404);
  });

  it("resolves an Organization id to that Organization even when another Organization's vanity URL equals it", async () => {
    await ctx.databaseRuntime.runPromise(
      ctx.database
        .update(guildTable)
        .set({ vanityUrl: authorizedGuildId })
        .where(eq(guildTable.id, forbiddenGuildId)),
    );

    const forbidden = await ctx.request(`/guilds/${forbiddenGuildId}`);
    expect(forbidden.status).toBe(403);

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const authorized = await ctx.request(`/guilds/${authorizedGuildId}`);
      expect(authorized.status).toBe(200);
      expect(await authorized.json()).toMatchObject({
        id: authorizedGuildId,
        name: "Authorized Organization",
      });
      expect(
        (await ctx.request(`/guilds/${authorizedGuildId}/loots`)).status,
      ).toBe(200);
    }
  });

  it("refuses to store a vanity URL that could be an Organization id", async () => {
    const stored = await ctx.databaseRuntime.runPromise(
      ctx.database
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
      const response = await ctx.request(
        `/guilds/${authorizedGuildId}/config`,
        {
          method: "PATCH",
          body: JSON.stringify({ vanityUrl }),
        },
      );

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ code });

      const [guild] = await ctx.databaseRuntime.runPromise(
        ctx.database
          .select({ vanityUrl: guildTable.vanityUrl })
          .from(guildTable)
          .where(eq(guildTable.id, authorizedGuildId)),
      );

      expect(guild?.vanityUrl).toBeNull();
    },
  );
});
