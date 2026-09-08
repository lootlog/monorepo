import { buildTimerKey } from "#src/timers/timer-key";
import { expect, it } from "bun:test";
import { Effect, Queue } from "effect";
import { createAccessPolicy } from "@lootlog/domain/access-policy";
import { Permission } from "@lootlog/schema/permissions";
import { createDatabaseBoundary } from "../../../test/database-fixtures.js";
import {
  createGuildFixture,
  createMemberFixture,
} from "../../../test/organization-fixtures.js";
import {
  eventTable,
  eventHeroNpcTable,
  guildTable,
  memberTable,
  timerTable,
} from "#src/database/drizzle/schema";
import { makeEventHeroSummary } from "#src/events/kills/event-hero-summary";
import { makeEventTimersPort } from "#src/events/respawn/event-timers.port";
import { makeEventTimerStore } from "#src/events/respawn/event-timer.store";
import { makeEventAccess } from "#src/events/event-access";
import { RedisService } from "#src/redis/redis.service";
import { RedlockService } from "#src/redis/redlock";
import { applicationLogger } from "#src/shared/application-logger";
import { makeEventsRanking } from "./events-ranking.operations.js";

const unexpected = () => Effect.die("Unexpected external operation");

it("filters hero timers by NPC level before exposing their public projection", async () => {
  const boundary = await createDatabaseBoundary();
  try {
    const database = boundary.database;
    const now = new Date();
    await boundary.run(
      database.insert(guildTable).values(createGuildFixture()),
    );
    await boundary.run(
      database.insert(memberTable).values(createMemberFixture()),
    );
    await boundary.run(
      database.insert(eventTable).values({
        id: "event-1",
        guildId: "guild-1",
        name: "Event",
        world: "Aldous",
        updatedAt: now,
      }),
    );
    const heroes = [
      { npcId: 1, npcName: "Low", npcLvl: 50 },
      { npcId: 2, npcName: "High", npcLvl: 300 },
      { npcId: 3, npcName: "Unknown", npcLvl: null },
    ];
    await boundary.run(
      database.insert(eventHeroNpcTable).values(
        heroes.map((hero) => ({
          ...hero,
          id: `hero-${hero.npcId}`,
          eventId: "event-1",
        })),
      ),
    );
    await boundary.run(
      database.insert(timerTable).values(
        heroes.map((hero) => ({
          guildId: "guild-1",
          world: "Aldous",
          npcId: hero.npcId,
          timerKey: buildTimerKey(hero.npcId, hero.npcName),
          createdById: 1,
          minSpawnTime: now,
          maxSpawnTime: now,
          updatedAt: now,
          npc: { name: hero.npcName, icon: "hero.png", lvl: hero.npcLvl },
        })),
      ),
    );
    const redis = new RedisService(
      {
        send: unexpected,
        eval: () => unexpected,
        subscribe: () => Queue.unbounded(),
      },
      {},
      Effect.runPromise,
    );
    const timers = makeEventTimersPort({
      store: makeEventTimerStore(database),
      redis,
      redlock: new RedlockService(redis),
      logger: applicationLogger,
      amqp: { publish: unexpected },
    });
    const summary = makeEventHeroSummary(
      database,
      redis,
      timers,
      applicationLogger,
    );
    const ranking = makeEventsRanking(
      { getRanking: unexpected, getEditHistories: unexpected },
      {
        getEventKillHistory: unexpected,
        getMemberKillHistory: unexpected,
        getHeroKillHistory: unexpected,
        getKillDetail: unexpected,
      },
      { getEventOverview: unexpected },
      makeEventAccess(database),
      {
        getPending: unexpected,
        acknowledgeExpired: unexpected,
        confirm: unexpected,
      },
      { updateRanking: unexpected, updateKillPoint: unexpected },
      summary,
    );
    const visible = await boundary.run(
      ranking.getEventHeroTimers(
        { id: "guild-1" },
        "event-1",
        "Aldous",
        [
          {
            id: "role-1",
            guildId: "guild-1",
            name: "Role",
            color: null,
            position: null,
            permissions: [Permission.LOOTLOG_EVENTS_READ],
            lvlRangeFrom: 1,
            lvlRangeTo: 100,
            createdAt: now,
            updatedAt: now,
          },
        ],
        createAccessPolicy({ capabilities: [Permission.LOOTLOG_EVENTS_READ] }),
      ),
    );
    expect(visible.map((timer) => timer.npc.name).sort()).toEqual([
      "Low",
      "Unknown",
    ]);
    expect(visible.every((timer) => !("npcLvl" in timer))).toBe(true);
    expect(visible.every((timer) => !("lvl" in timer.npc))).toBe(true);
  } finally {
    await boundary.dispose();
  }
});
