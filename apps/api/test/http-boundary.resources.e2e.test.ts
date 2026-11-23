import { TimerResponse } from "#src/contracts/timers/schemas";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "bun:test";
import { Effect, Schema } from "effect";
import { count, eq } from "drizzle-orm";
import { getCompleteUserGuildsCacheKey } from "#src/discord/discord-cache.util";
import { itemSnapshotTable } from "../src/database/drizzle/loot.schema.js";
import {
  notificationTargetTable,
  watchedItemTable,
} from "../src/database/drizzle/notification.schema.js";
import { memberTable } from "../src/database/drizzle/organization.schema.js";
import { timerTable } from "../src/database/drizzle/timer.schema.js";
import {
  authorizedGuildId,
  caller,
  createHttpBoundaryContext,
  forbiddenGuildId,
  world,
} from "./http-boundary.e2e.fixtures.js";

describe("API HTTP boundary - resources", () => {
  const ctx = createHttpBoundaryContext();

  beforeAll(() => ctx.setup());
  beforeEach(() => ctx.reset());
  afterAll(() => ctx.teardown());

  it("resolves notification senders from member summaries using Discord IDs", async () => {
    const notification = await ctx.request("/messaging", {
      method: "POST",
      body: JSON.stringify({
        guildIds: [authorizedGuildId],
        world,
        message: "Hej",
      }),
    });

    expect(notification.status).toBe(201);

    const event = ctx.publishedMessages.find(
      ({ routingKey }) => routingKey === "guilds.notifications.send",
    );

    expect(event).toBeDefined();

    if (!event) throw new Error("Notification was not published");

    const payload: unknown = JSON.parse(
      new TextDecoder().decode(event.content),
    );

    expect(payload).toEqual(
      expect.objectContaining({ discordId: caller.discordId }),
    );

    const expectSenderSummary = async () => {
      const response = await ctx.request(
        `/guilds/${authorizedGuildId}/members/summary`,
      );

      expect(response.status).toBe(200);
      const members = await response.json();
      expect(members).toEqual([
        expect.objectContaining({
          userId: caller.discordId,
          name: "Authorized member",
        }),
      ]);
    };

    await expectSenderSummary();
    await expectSenderSummary();
  });

  it("serves the Organization list from a cached Discord guild list without deactivating members", async () => {
    await Effect.runPromise(
      ctx.redis.set(
        getCompleteUserGuildsCacheKey(caller),
        JSON.stringify({
          guilds: [{ id: authorizedGuildId, name: "Authorized Organization" }],
          fetchedAt: Date.now() - 10 * 60_000,
        }),
        60,
      ),
    );

    const cached = await ctx.request("/users/@me/guilds");

    expect(cached.status).toBe(200);
    expect(await cached.json()).toEqual([
      expect.objectContaining({
        id: authorizedGuildId,
        isAccessDataStale: false,
      }),
    ]);
    expect(
      await ctx.databaseRuntime.runPromise(
        ctx.database
          .select({ active: memberTable.active })
          .from(memberTable)
          .where(eq(memberTable.guildId, forbiddenGuildId)),
      ),
    ).toEqual([{ active: true }]);

    const refreshed = await ctx.request("/users/@me/guilds/refresh", {
      method: "POST",
    });

    expect(refreshed.status).toBe(500);
  });

  it("returns watched item snapshots after create, quick-add and retry", async () => {
    const seedDiscordGuilds = () =>
      Effect.runPromise(
        ctx.redis.set(
          getCompleteUserGuildsCacheKey(caller),
          JSON.stringify({
            guilds: [
              { id: authorizedGuildId, name: "Authorized Organization" },
            ],
            fetchedAt: Date.now(),
          }),
          60,
        ),
      );

    const itemId = 990001;
    await ctx.databaseRuntime.runPromise(
      Effect.gen(function* () {
        yield* ctx.database.insert(notificationTargetTable).values({
          ownerType: "USER",
          ownerId: caller.discordId,
          provider: "DISCORD",
          targetType: "DM",
          externalId: "watched-item-test-dm",
          updatedAt: new Date(),
        });
        yield* ctx.database.insert(itemSnapshotTable).values({
          gameVersion: "pl",
          itemId,
          statsHash: "watched-item-test",
          name: "Watched item",
          icon: "item.png",
          statRaw: "lvl=80",
          statsSnapshot: {},
        });
      }),
    );

    for (const [path, scope, expectedSnapshot] of [
      ["/quick-add", { guildId: authorizedGuildId }, null],
      [
        "",
        { guildIds: [authorizedGuildId] },
        { name: "Watched item", icon: "item.png" },
      ],
      [
        "/quick-add",
        { guildId: authorizedGuildId },
        { name: "Watched item", icon: "item.png" },
      ],
    ] as const) {
      await seedDiscordGuilds();

      const response = await ctx.request(
        `/users/@me/notifications/watched-items${path}`,
        {
          method: "POST",
          body: JSON.stringify({
            itemId,
            itemName:
              expectedSnapshot === null ? "No snapshot" : "Watched item",
            world,
            ...scope,
          }),
        },
      );

      expect(response.status).toBe(201);
      expect(await response.json()).toMatchObject({
        itemId,
        itemSnapshot: expectedSnapshot,
      });
    }

    expect(
      await ctx.databaseRuntime.runPromise(
        ctx.database.select({ value: count() }).from(watchedItemTable),
      ),
    ).toEqual([{ value: 1 }]);
    const listed = await ctx.request("/users/@me/notifications/watched-items");
    expect(listed.status).toBe(200);
    expect(await listed.json()).toMatchObject([
      { itemId, itemSnapshot: { name: "Watched item" } },
    ]);
  });

  it("creates, reads and deletes a timer through the real router and database", async () => {
    const actorCharacter = {
      accountId: "123",
      characterId: "456",
      name: "Timer reporter",
      prof: "w",
      icon: "reporter.gif",
      lvl: 80,
    };

    const expectedActor = {
      ...actorCharacter,
      accountId: 123,
      characterId: 456,
      prof: "WARRIOR",
    };

    const createdResponse = await ctx.request(
      `/guilds/${authorizedGuildId}/timers/manual`,
      {
        method: "POST",
        body: JSON.stringify({
          name: "Test boss",
          actorCharacter,
          minSeconds: 60,
          maxSeconds: 120,
          world,
        }),
      },
    );

    const createdBody = await createdResponse.text();
    expect({ status: createdResponse.status, body: createdBody }).toMatchObject(
      {
        status: 201,
      },
    );

    const created = Schema.decodeUnknownSync(Schema.toEncoded(TimerResponse))(
      JSON.parse(createdBody),
    );

    expect(created).toMatchObject({
      guildId: authorizedGuildId,
      world,
      npc: { name: "Test boss" },
      actorCharacter: expectedActor,
    });
    expect(await ctx.countTimers()).toBe(1);

    const listedResponse = await ctx.request(
      `/guilds/${authorizedGuildId}/timers?world=${world}`,
    );

    expect(listedResponse.status).toBe(200);
    expect(await listedResponse.json()).toEqual([
      expect.objectContaining({
        timerKey: created.timerKey,
        actorCharacter: expectedActor,
      }),
    ]);

    const allTimersResponse = await ctx.request(`/timers?world=${world}`);
    expect(await allTimersResponse.json()).toEqual([
      expect.objectContaining({
        timerKey: created.timerKey,
        actorCharacter: expectedActor,
      }),
    ]);

    const deletedResponse = await ctx.request(
      `/guilds/${authorizedGuildId}/timers/${encodeURIComponent(created.timerKey)}?world=${world}`,
      { method: "DELETE" },
    );

    expect(deletedResponse.status).toBe(200);
    expect(await ctx.countTimers()).toBe(0);

    const [deletedTimer] = await ctx.databaseRuntime.runPromise(
      ctx.database
        .select({ deletedAt: timerTable.deletedAt })
        .from(timerTable)
        .where(eq(timerTable.timerKey, created.timerKey)),
    );

    expect(deletedTimer?.deletedAt).toBeInstanceOf(Date);

    const afterDeleteResponse = await ctx.request(
      `/guilds/${authorizedGuildId}/timers?world=${world}`,
    );

    expect(await afterDeleteResponse.json()).toEqual([]);
    expect(await (await ctx.request(`/timers?world=${world}`)).json()).toEqual(
      [],
    );
  });

  it("rejects a cross-Organization mutation and leaves persistence unchanged", async () => {
    const response = await ctx.request(
      `/guilds/${forbiddenGuildId}/timers/manual`,
      {
        method: "POST",
        body: JSON.stringify({
          name: "Hidden boss",
          minSeconds: 60,
          maxSeconds: 120,
          world,
        }),
      },
    );

    expect(response.status).toBe(403);
    expect(await ctx.countTimers()).toBe(0);
  });

  it("searches timed NPCs by identity across the Organization's worlds", async () => {
    const [member] = await ctx.databaseRuntime.runPromise(
      ctx.database
        .select({ id: memberTable.id })
        .from(memberTable)
        .where(eq(memberTable.guildId, authorizedGuildId)),
    );

    const now = new Date();

    const timer = (guildId: string, timerWorld: string, npcId: number) => ({
      guildId,
      world: timerWorld,
      npcId,
      timerKey: `${npcId}:kic`,
      createdById: member?.id ?? 0,
      npc: { id: npcId, templateId: 77, name: "Kic", lvl: 60, type: "ELITE2" },
      minSpawnTime: now,
      maxSpawnTime: new Date(now.getTime() + 60_000),
      updatedAt: now,
    });

    await ctx.databaseRuntime.runPromise(
      ctx.database
        .insert(timerTable)
        .values([
          timer(authorizedGuildId, world, 1),
          timer(authorizedGuildId, "other world", 2),
          timer(forbiddenGuildId, world, 3),
        ]),
    );

    const search = (query: string) =>
      ctx.request(`/guilds/${authorizedGuildId}/timers/npcs/search?${query}`);

    const byTemplate = await search("templateIds=77");
    expect(byTemplate.status).toBe(200);
    expect(await byTemplate.json()).toEqual([
      expect.objectContaining({ world, npcId: 1, templateId: 77 }),
      expect.objectContaining({ world: "other world", npcId: 2 }),
    ]);

    const byRuntimeIds = await search(`npcIds=1&npcIds=2&world=${world}`);
    expect(await byRuntimeIds.json()).toEqual([
      expect.objectContaining({ world, npcId: 1 }),
    ]);

    expect((await search(`world=${world}`)).status).toBe(400);
    expect((await search("npcIds=2147483648")).status).toBe(400);
  });
});
