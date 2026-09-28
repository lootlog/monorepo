import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { Effect, Queue } from "effect";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { createDatabaseBoundary } from "../../../test/database-fixtures.js";
import {
  createGuildFixture,
  createMemberFixture,
} from "../../../test/organization-fixtures.js";
import {
  eventHeroNpcTable,
  eventMapTable,
  eventMapToMemberTable,
  eventPresenceLogTable,
  eventTable,
  guildTable,
  memberTable,
  timerTable,
} from "#src/database/drizzle/schema";
import { makeEventReadCache } from "#src/events/catalog/event-read-cache.service";
import { makeEventTimersPort } from "#src/events/respawn/event-timers.port";
import { makeEventTimerStore } from "#src/events/respawn/event-timer.store";
import { RedisService } from "#src/redis/redis.service";
import { RedlockService } from "#src/redis/redlock";
import { applicationLogger } from "#src/shared/application-logger";
import { buildTimerKey } from "#src/timers/timer-key";
import { makeEventPresenceTracking } from "./event-presence-tracking.js";

const unexpected = () => Effect.die("Unexpected external operation");

const EVENT_MAP = "Kwieciste Przejście";

describe("event presence tracking", () => {
  let boundary: Awaited<ReturnType<typeof createDatabaseBoundary>>;

  beforeEach(async () => {
    boundary = await createDatabaseBoundary();
    const database = boundary.database;
    const now = new Date();
    const past = new Date(now.getTime() - 60 * 60 * 1000);

    await boundary.run(
      database
        .insert(guildTable)
        .values([
          createGuildFixture(),
          createGuildFixture({ id: "guild-2", ownerId: "owner-2" }),
        ]),
    );
    await boundary.run(
      database.insert(memberTable).values(createMemberFixture()),
    );
    await boundary.run(
      database.insert(eventTable).values([
        {
          id: "active",
          guildId: "guild-1",
          name: "Active",
          world: "Aldous",
          startsAt: past,
          updatedAt: now,
        },
        {
          id: "ended",
          guildId: "guild-1",
          name: "Ended",
          world: "Aldous",
          startsAt: past,
          endsAt: new Date(now.getTime() - 60 * 1000),
          updatedAt: now,
        },
        {
          id: "other-organization",
          guildId: "guild-2",
          name: "Other",
          world: "Aldous",
          startsAt: past,
          updatedAt: now,
        },
      ]),
    );
    await boundary.run(
      database.insert(eventHeroNpcTable).values(
        ["active", "ended", "other-organization"].map((eventId) => ({
          id: `hero-${eventId}`,
          eventId,
          npcId: 1,
          npcName: "Hero",
          npcLvl: 100,
        })),
      ),
    );
    await boundary.run(
      database.insert(eventMapTable).values([
        {
          id: "map-active",
          heroNpcId: "hero-active",
          mapId: 1,
          mapName: EVENT_MAP,
          updatedAt: now,
        },
        {
          id: "map-ended",
          heroNpcId: "hero-ended",
          mapId: 2,
          mapName: "Ended map",
          updatedAt: now,
        },
        {
          id: "map-other-organization",
          heroNpcId: "hero-other-organization",
          mapId: 3,
          mapName: "Other Organization map",
          updatedAt: now,
        },
      ]),
    );
    await boundary.run(
      database.insert(eventMapToMemberTable).values({ A: "map-active", B: 1 }),
    );
    await boundary.run(
      database.insert(timerTable).values(
        ["guild-1", "guild-2"].map((guildId) => ({
          guildId,
          world: "Aldous",
          npcId: 1,
          timerKey: buildTimerKey(1, "Hero"),
          createdById: 1,
          minSpawnTime: now,
          maxSpawnTime: now,
          updatedAt: now,
          npc: { name: "Hero", icon: "hero.png", lvl: 100 },
        })),
      ),
    );
  });

  afterEach(async () => {
    await boundary.dispose();
  });

  const makeTracking = () => {
    const database = boundary.database;
    const lockCalls = mock().mockResolvedValue(1);

    const emitted: Array<{ routingKey: string; payload: unknown }> = [];

    const redis = new RedisService(
      {
        send: unexpected,
        eval: () => unexpected,
        subscribe: () => Queue.unbounded(),
      },
      {},
      Effect.runPromise,
    );

    const tracking = makeEventPresenceTracking(
      database,
      makeEventTimersPort({
        store: makeEventTimerStore(database),
        redis,
        redlock: new RedlockService(redis),
        logger: applicationLogger,
        amqp: { publish: unexpected },
      }),
      new RedlockService({ eval: lockCalls }),
      {
        emit: (routingKey, payload) =>
          Effect.sync(() => {
            emitted.push({ routingKey, payload });
          }),
      },
      makeEventReadCache({
        getOrSetJsonEffect: (options) => options.factory,
        invalidateScopes: async () => {},
      }),
    );

    const presenceLogs = () =>
      boundary.run(
        database
          .select({
            mapId: eventPresenceLogTable.mapId,
            endedAt: eventPresenceLogTable.endedAt,
          })
          .from(eventPresenceLogTable),
      );

    return { tracking, lockCalls, emitted, presenceLogs };
  };

  it("records presence and publishes map status for an active event map", async () => {
    const { tracking, lockCalls, emitted, presenceLogs } = makeTracking();

    await boundary.run(
      tracking.handlePlayerPresenceChange("guild-1", EVENT_MAP, "user-1", true),
    );

    expect(lockCalls).toHaveBeenCalled();
    expect(await presenceLogs()).toEqual([
      { mapId: "map-active", endedAt: null },
    ]);
    expect(emitted).toEqual([
      {
        routingKey: RabbitRoutingKey.EVENT_MAP_STATUS_UPDATE,
        payload: {
          guildId: "guild-1",
          eventId: "active",
          mapId: "map-active",
          heroNpcLvl: 100,
          reason: "presence",
        },
      },
    ]);

    await boundary.run(
      tracking.handlePlayerPresenceChange(
        "guild-1",
        EVENT_MAP,
        "user-1",
        false,
      ),
    );

    expect((await presenceLogs())[0]?.endedAt).toBeInstanceOf(Date);
    expect(emitted).toHaveLength(2);
  });

  it.each([
    { name: "a map outside every event", mapName: "Ithan" },
    { name: "a map of an ended event", mapName: "Ended map" },
    {
      name: "a map active only in another Organization",
      mapName: "Other Organization map",
    },
  ])("skips the lock and all writes for $name", async ({ mapName }) => {
    const { tracking, lockCalls, emitted, presenceLogs } = makeTracking();

    await boundary.run(
      tracking.handlePlayerPresenceChange("guild-1", mapName, "user-1", true),
    );

    expect(lockCalls).not.toHaveBeenCalled();
    expect(await presenceLogs()).toEqual([]);
    expect(emitted).toEqual([]);
  });
});
