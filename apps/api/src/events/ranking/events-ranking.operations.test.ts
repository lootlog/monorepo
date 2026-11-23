import { buildTimerKey } from "#src/timers/timer-key";
import { expect, it } from "bun:test";
import { Effect } from "effect";
import { createAccessPolicy } from "@lootlog/domain/access-policy";
import { Capability } from "@lootlog/schema/permissions";
import { createDatabaseBoundary } from "../../../test/database-fixtures.js";
import {
  createGuildFixture,
  createMemberFixture,
} from "../../../test/organization-fixtures.js";
import {
  eventTable,
  eventHeroNpcTable,
} from "#src/database/drizzle/event.schema";
import {
  guildTable,
  memberTable,
} from "#src/database/drizzle/organization.schema";
import { timerTable } from "#src/database/drizzle/timer.schema";
import { makeEventHeroSummary } from "#src/events/kills/event-hero-summary";
import { makeEventTimersPort } from "#src/events/respawn/event-timers.port";
import { makeEventTimerStore } from "#src/events/respawn/event-timer.repository";
import { makeEventAccess } from "#src/events/event-access";
import { makeRedisLockManager } from "#src/redis/redlock";
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

    const redis = {
      invalidateScopes: unexpected,
      getOrSetJson: <A, E>(options: {
        readonly factory: Effect.Effect<A, E>;
      }) => options.factory,
    };

    const timers = makeEventTimersPort({
      store: makeEventTimerStore(database),
      redis,
      locks: makeRedisLockManager({ eval: unexpected }),
      amqp: { publish: unexpected },
    });

    const summary = makeEventHeroSummary(database, redis, timers);

    const ranking = makeEventsRanking(
      { getRanking: unexpected, getEditHistories: unexpected },
      { getEvent: unexpected },
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
            permissions: [Capability.LOOTLOG_EVENTS_READ],
            lvlRangeFrom: 1,
            lvlRangeTo: 100,
            createdAt: now,
            updatedAt: now,
          },
        ],
        createAccessPolicy({ capabilities: [Capability.LOOTLOG_EVENTS_READ] }),
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
