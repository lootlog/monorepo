import { expect, it } from "bun:test";
import { Effect } from "effect";
import {
  guildTable,
  memberTable,
} from "#src/database/drizzle/organization.schema";
import {
  timerHistoryEntryTable,
  timerTable,
} from "#src/database/drizzle/timer.schema";
import { userCharactersLootlogSettingsTable } from "#src/database/drizzle/user.schema";
import { buildTimerKey } from "./timer-key.js";
import { getTimerNpcId } from "@lootlog/domain/npc-identity";
import { createDatabaseBoundary } from "../../test/database-fixtures.js";
import {
  createGuildFixture,
  createMemberFixture,
} from "../../test/organization-fixtures.js";
import { makeAutoTimer } from "./timer-auto.data-layer.js";
import { singleFlightLocks } from "./timer-auto.fixtures.js";

it.each([
  { stored: 3600, reported: 5400, counted: 3600 },
  { stored: 5400, reported: 1800, counted: 1800 },
])(
  "keeps one timer per Hero Tracker across hiding places, counting a $counted s respawn from the entrance closing when $stored s is stored and $reported s reported",
  async ({ stored, reported, counted }) => {
    const boundary = await createDatabaseBoundary();

    try {
      const { database } = boundary;
      const guild = createGuildFixture();

      const member = createMemberFixture({
        userId: guild.ownerId,
        globalUserId: "user",
      });

      const now = new Date();
      const trackerName = "Doświadczony Tropiciel Herosów";
      await boundary.run(database.insert(guildTable).values(guild));
      await boundary.run(database.insert(memberTable).values(member));
      await boundary.run(
        database.insert(userCharactersLootlogSettingsTable).values({
          userId: member.userId,
          accountId: "1",
          characterId: "2",
          catchingGuildIds: [guild.id],
          updatedAt: now,
        }),
      );

      const trackerTimerNpcId = getTimerNpcId({
        id: 190436,
        name: trackerName,
      });

      await boundary.run(
        database.insert(timerTable).values({
          guildId: guild.id,
          world: "world",
          npcId: trackerTimerNpcId,
          timerKey: buildTimerKey(trackerTimerNpcId, trackerName),
          createdById: member.id,
          npc: {
            id: 190436,
            name: trackerName,
            lvl: 282,
            type: "HERO_TRACKER",
          },
          latestRespBaseSeconds: stored,
          minSpawnTime: new Date(now.getTime() - 60 * 60_000),
          maxSpawnTime: new Date(now.getTime() - 30 * 60_000),
          updatedAt: now,
        }),
      );

      const create = makeAutoTimer(database, {
        closeKilledNpcGatherings: () => Effect.void,
        get: () => Effect.succeed(null),
        set: () => Effect.void,
        locks: singleFlightLocks(),
        invalidateList: () => Effect.void,
        publishHeroSighting: () => Effect.void,
        signalEventHeroChecks: Effect.void,
        withLock: (_key, operation) => operation,
        publish: () => Effect.void,
      });

      const reportedAt = Date.now();

      await boundary.run(
        create(
          { discordId: member.userId, userId: "user" },
          {
            respBaseSeconds: reported,
            respawnRandomness: 50,
            entranceSecondsLeft: 1200,
            world: "world",
            npc: {
              id: 190999,
              name: trackerName,
              location: "Jaskinia Piaskowej Burzy s.1",
              lvl: 282,
              wt: 0,
              icon: "npc/tropiciel.gif",
              type: 0,
            },
            accountId: "1",
            characterId: "2",
          },
        ),
      );

      const timers = await boundary.run(database.select().from(timerTable));

      expect(timers).toHaveLength(1);
      const entranceClosesAt = timers[0]?.entranceClosesAt?.getTime() ?? 0;

      expect(entranceClosesAt).toBeGreaterThanOrEqual(reportedAt + 1_200_000);
      expect(entranceClosesAt).toBeLessThanOrEqual(Date.now() + 1_200_000);
      expect(timers[0]).toMatchObject({
        latestRespBaseSeconds: counted,
        minSpawnTime: new Date(entranceClosesAt + counted * 500),
        maxSpawnTime: new Date(entranceClosesAt + counted * 1500),
        npc: { id: 190999, type: "HERO_TRACKER" },
      });
    } finally {
      await boundary.dispose();
    }
  },
);

it("keeps the window of an open Hero Tracker entrance when another player reports it", async () => {
  const boundary = await createDatabaseBoundary();

  try {
    const { database } = boundary;
    const guild = createGuildFixture();

    const member = createMemberFixture({
      userId: guild.ownerId,
      globalUserId: "user",
    });

    const now = new Date();
    const trackerName = "Doświadczony Tropiciel Herosów";
    await boundary.run(database.insert(guildTable).values(guild));
    await boundary.run(database.insert(memberTable).values(member));
    await boundary.run(
      database.insert(userCharactersLootlogSettingsTable).values({
        userId: member.userId,
        accountId: "1",
        characterId: "2",
        catchingGuildIds: [guild.id],
        updatedAt: now,
      }),
    );
    const trackerTimerNpcId = getTimerNpcId({ id: 190436, name: trackerName });
    const entranceClosesAt = new Date(now.getTime() + 15 * 60_000);

    const stored = {
      guildId: guild.id,
      world: "world",
      npcId: trackerTimerNpcId,
      timerKey: buildTimerKey(trackerTimerNpcId, trackerName),
      createdById: member.id,
      npc: { id: 190436, name: trackerName, lvl: 282, type: "HERO_TRACKER" },
      latestRespBaseSeconds: 5400,
      entranceClosesAt,
      minSpawnTime: new Date(entranceClosesAt.getTime() + 45 * 60_000),
      maxSpawnTime: new Date(entranceClosesAt.getTime() + 135 * 60_000),
      updatedAt: new Date(now.getTime() - 5 * 60_000),
    };

    await boundary.run(database.insert(timerTable).values(stored));

    const published: string[] = [];

    const create = makeAutoTimer(database, {
      closeKilledNpcGatherings: () => Effect.void,
      get: () => Effect.succeed(null),
      set: () => Effect.void,
      locks: singleFlightLocks(),
      invalidateList: () => Effect.void,
      publishHeroSighting: () => Effect.void,
      signalEventHeroChecks: Effect.void,
      withLock: (_key, operation) => operation,
      publish: (routingKey) =>
        Effect.sync(() => {
          published.push(routingKey);
        }),
    });

    await boundary.run(
      create(
        { discordId: member.userId, userId: "user" },
        {
          respBaseSeconds: 5400,
          respawnRandomness: 50,
          entranceSecondsLeft: 15 * 60 - 3,
          world: "world",
          npc: {
            id: 190436,
            name: trackerName,
            location: "Jaskinia Piaskowej Burzy s.1",
            lvl: 282,
            wt: 0,
            icon: "npc/tropiciel.gif",
            type: 0,
          },
          accountId: "1",
          characterId: "2",
        },
      ),
    );

    const timers = await boundary.run(database.select().from(timerTable));

    const history = await boundary.run(
      database.select().from(timerHistoryEntryTable),
    );

    expect(timers).toHaveLength(1);
    expect(timers[0]).toMatchObject({
      entranceClosesAt: stored.entranceClosesAt,
      minSpawnTime: stored.minSpawnTime,
      maxSpawnTime: stored.maxSpawnTime,
      updatedAt: stored.updatedAt,
    });
    expect(history).toHaveLength(0);
    expect(published).toHaveLength(0);
  } finally {
    await boundary.dispose();
  }
});

it("rejects a timer for an elite I, which Margonem weighs up to 19", async () => {
  const boundary = await createDatabaseBoundary();

  try {
    const create = makeAutoTimer(boundary.database, {
      closeKilledNpcGatherings: () => Effect.void,
      get: () => Effect.die("unused"),
      set: () => Effect.die("unused"),
      locks: singleFlightLocks(),
      invalidateList: () => Effect.die("unused"),
      publishHeroSighting: () => Effect.void,
      signalEventHeroChecks: Effect.die("unused"),
      withLock: (_key, operation) => operation,
      publish: () => Effect.die("unused"),
    });

    const error = await boundary.run(
      Effect.flip(
        create(
          { discordId: "discord", userId: "user" },
          {
            respBaseSeconds: 600,
            world: "world",
            npc: {
              id: 1,
              name: "Elita",
              location: "Mapa",
              lvl: 50,
              wt: 19,
              icon: "npc/elita.gif",
              type: 2,
            },
            accountId: "1",
            characterId: "2",
          },
        ),
      ),
    );

    expect(error).toMatchObject({ message: "WT_TOO_LOW" });
  } finally {
    await boundary.dispose();
  }
});
