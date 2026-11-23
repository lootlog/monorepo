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
import { count } from "drizzle-orm";
import { getCompleteUserGuildsCacheKey } from "#src/discord/discord-cache.util";
import { itemSnapshotTable } from "../src/database/drizzle/loot.schema.js";
import {
  notificationTargetTable,
  watchedItemTable,
} from "../src/database/drizzle/notification.schema.js";
import {
  authorizedGuildId,
  caller,
  forbiddenGuildId,
  headers,
  makeHttpBoundaryFixture,
  world,
} from "./http-boundary-fixtures.js";

const fixture = makeHttpBoundaryFixture();

const { boundary, request, databaseRuntime, publishedMessages } = fixture;

let database: ApiDatabaseValue;

let redis: RedisService;

describe("API HTTP boundary notifications", () => {
  beforeAll(async () => {
    ({ database, redis } = await fixture.connect());
  });

  beforeEach(fixture.reset);

  afterAll(fixture.close);

  it("resolves notification senders from member summaries using Discord IDs", async () => {
    const notification = await request("/messaging", {
      method: "POST",
      body: JSON.stringify({
        guildIds: [authorizedGuildId],
        world,
        message: "Hej",
      }),
    });

    expect(notification.status).toBe(201);

    const event = publishedMessages.find(
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
      const response = await request(
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

  it("returns watched item snapshots after create, quick-add and retry", async () => {
    const seedDiscordGuilds = () =>
      Effect.runPromise(
        redis.set(
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
    await databaseRuntime.runPromise(
      Effect.gen(function* () {
        yield* database.insert(notificationTargetTable).values({
          ownerType: "USER",
          ownerId: caller.discordId,
          provider: "DISCORD",
          targetType: "DM",
          externalId: "watched-item-test-dm",
          updatedAt: new Date(),
        });
        yield* database.insert(itemSnapshotTable).values({
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

      const response = await request(
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
      await databaseRuntime.runPromise(
        database.select({ value: count() }).from(watchedItemTable),
      ),
    ).toEqual([{ value: 1 }]);
    const listed = await request("/users/@me/notifications/watched-items");
    expect(listed.status).toBe(200);
    expect(await listed.json()).toMatchObject([
      { itemId, itemSnapshot: { name: "Watched item" } },
    ]);
  });

  it("enforces Organization access for events and notifications", async () => {
    const responses = await Promise.all([
      request(`/guilds/${authorizedGuildId}/events`),
      request(`/guilds/${forbiddenGuildId}/events`),
      request(`/guilds/${authorizedGuildId}/notifications/targets`),
      request(`/guilds/${forbiddenGuildId}/notifications/targets`),
      request("/users/@me/notifications/targets"),
      boundary.handler(
        new Request("http://api.test/users/@me/notifications/targets", {
          headers: { authorization: headers.authorization },
        }),
      ),
    ]);

    expect(responses.map(({ status }) => status)).toEqual([
      200, 403, 200, 403, 200, 401,
    ]);
  });
});
