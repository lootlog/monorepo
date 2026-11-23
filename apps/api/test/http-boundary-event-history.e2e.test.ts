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
import { eq } from "drizzle-orm";
import { Capability } from "@lootlog/schema/permissions";
import { getPermissionsCacheKey } from "#src/shared/cache";
import {
  guildTable,
  memberTable,
  roleTable,
} from "../src/database/drizzle/organization.schema.js";
import {
  eventTable,
  eventHeroNpcTable,
  eventHeroKillTable,
  eventKillPointTable,
} from "../src/database/drizzle/event.schema.js";
import {
  authorizedGuildId,
  caller,
  forbiddenGuildId,
  makeHttpBoundaryFixture,
  world,
} from "./http-boundary-fixtures.js";

const fixture = makeHttpBoundaryFixture();

const { request, databaseRuntime } = fixture;

let database: ApiDatabaseValue;

let redis: RedisService;

describe("API HTTP boundary event history", () => {
  beforeAll(async () => {
    ({ database, redis } = await fixture.connect());
  });

  beforeEach(fixture.reset);

  afterAll(fixture.close);

  const seedKillHistory = async () => {
    const highKill = "eeeeeeee-1111-4111-8111-111111111111";
    const newestLowKill = "ffffffff-1111-4111-8111-111111111111";
    const oldestLowKill = "aaaaaaaa-1111-4111-8111-111111111111";
    const foreignKill = "dddddddd-1111-4111-8111-111111111111";
    const now = new Date();

    const members = await databaseRuntime.runPromise(
      database
        .select({ id: memberTable.id })
        .from(memberTable)
        .where(eq(memberTable.guildId, authorizedGuildId)),
    );

    const memberId = members[0]?.id;

    if (memberId === undefined) throw new Error("Expected authorized member");
    await databaseRuntime.runPromise(
      Effect.gen(function* () {
        yield* database.insert(eventTable).values([
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
        yield* database.insert(eventHeroNpcTable).values([
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
        yield* database.insert(eventHeroKillTable).values(
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
        yield* database.insert(eventKillPointTable).values(
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
    const first = await request(`${base}/kill-history?limit=1`);
    expect(first.status).toBe(200);
    const firstPage = await first.json();
    expect(firstPage).toMatchObject({
      kind: "event",
      items: [{ id: highKill, participantCount: 1 }],
    });
    expect(firstPage.items[0]).not.toHaveProperty("points");

    const continuation = await request(
      `${base}/kill-history?limit=2&cursor=${encodeURIComponent(firstPage.nextCursor)}`,
    );

    expect(continuation.status).toBe(200);
    expect(await continuation.json()).toMatchObject({
      items: [{ id: newestLowKill }, { id: oldestLowKill }],
      nextCursor: null,
    });

    const member = await request(
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
      expect((await request(`${base}/kill-history?${query}`)).status).toBe(400);
    }

    expect(
      (await request(`${base}/heroes/low-hero/kills/${foreignKill}`)).status,
    ).toBe(404);
    expect(
      (await request(`${base}/heroes/low-hero/kills/${foreignKill}/timeline`))
        .status,
    ).toBe(404);
  });

  it("rechecks history access after cache warmup, level changes and permission loss", async () => {
    const { highKill, newestLowKill, oldestLowKill } = await seedKillHistory();
    const base = `/guilds/${authorizedGuildId}/events/history`;
    expect(await (await request(`${base}/kill-history`)).json()).toMatchObject({
      items: [{ id: highKill }, { id: newestLowKill }, { id: oldestLowKill }],
    });

    const setAccess = async (permissions: Capability[], maximum: number) => {
      await databaseRuntime.runPromise(
        database
          .update(roleTable)
          .set({ permissions, lvlRangeFrom: 1, lvlRangeTo: maximum })
          .where(eq(roleTable.id, "timer-maintainer")),
      );
      await Effect.runPromise(
        redis.del(getPermissionsCacheKey(caller.userId, authorizedGuildId)),
      );
    };

    await setAccess([Capability.LOOTLOG_EVENTS_READ], 100);
    expect(await (await request(`${base}/kill-history`)).json()).toMatchObject({
      items: [{ id: newestLowKill }, { id: oldestLowKill }],
    });
    expect(
      (await request(`${base}/kill-history?heroId=high-hero`)).status,
    ).toBe(404);
    expect(
      (await request(`${base}/heroes/high-hero/kills/${highKill}`)).status,
    ).toBe(404);
    expect(
      (await request(`${base}/heroes/high-hero/kills/${highKill}/timeline`))
        .status,
    ).toBe(404);
    await setAccess([Capability.LOOTLOG_EVENTS_READ], 20);
    expect(await (await request(`${base}/kill-history`)).json()).toMatchObject({
      items: [],
      nextCursor: null,
    });
    await setAccess([], 100);
    expect((await request(`${base}/kill-history`)).status).toBe(403);
  });

  it("keeps read-only API key kill history inside its Organization scope", async () => {
    const { newestLowKill, oldestLowKill } = await seedKillHistory();
    const keyGuildId = "123456789012345678";
    const otherKeyGuildId = "987654321098765432";
    await databaseRuntime.runPromise(
      Effect.gen(function* () {
        yield* database
          .update(guildTable)
          .set({ id: keyGuildId })
          .where(eq(guildTable.id, authorizedGuildId));
        yield* database
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

    const allowed = await request(
      `/guilds/${keyGuildId}/events/history/kill-history?heroId=low-hero`,
      { headers: apiKeyHeaders([keyGuildId]) },
    );

    expect(allowed.status).toBe(200);
    expect(await allowed.json()).toMatchObject({
      items: [{ id: newestLowKill }, { id: oldestLowKill }],
    });
    expect(
      (
        await request(`/guilds/${keyGuildId}/events/history/kill-history`, {
          headers: apiKeyHeaders([otherKeyGuildId]),
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await request(
          `/guilds/${keyGuildId}/events/foreign-history/kill-history`,
          { headers: apiKeyHeaders([keyGuildId]) },
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await request(
          `/guilds/${otherKeyGuildId}/events/foreign-history/kill-history`,
          { headers: apiKeyHeaders([keyGuildId]) },
        )
      ).status,
    ).toBe(403);
  });
});
