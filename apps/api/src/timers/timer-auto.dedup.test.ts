import { expect, it } from "bun:test";
import { Effect } from "effect";
import { RedisError } from "effect/persistence/Redis";
import { eq } from "drizzle-orm";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import {
  guildTable,
  memberTable,
} from "#src/database/drizzle/organization.schema";
import {
  timerHistoryEntryTable,
  timerTable,
} from "#src/database/drizzle/timer.schema";
import { eventHeroCheckOutboxTable } from "#src/database/drizzle/event-hero-check-outbox.schema";
import { userCharactersLootlogSettingsTable } from "#src/database/drizzle/user.schema";
import { buildTimerKey } from "./timer-key.js";
import { createDatabaseBoundary } from "../../test/database-fixtures.js";
import {
  createGuildFixture,
  createMemberFixture,
} from "../../test/organization-fixtures.js";
import { makeAutoTimer } from "./timer-auto.data-layer.js";
import { TimerHistoryAction } from "./timers.types.js";
import { singleFlightLocks } from "./timer-auto.fixtures.js";

it("writes a kill within the dedup window of an event respawn window that has no CREATE history", async () => {
  const boundary = await createDatabaseBoundary();

  try {
    const { database } = boundary;
    const guild = createGuildFixture();

    const member = createMemberFixture({
      userId: guild.ownerId,
      globalUserId: "user",
    });

    const now = new Date();
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
    await boundary.run(
      database.insert(timerTable).values({
        guildId: guild.id,
        world: "world",
        npcId: 300,
        timerKey: buildTimerKey(300, "Hero"),
        createdById: member.id,
        npc: { id: 300, name: "Hero", lvl: 100, type: "hero" },
        minSpawnTime: now,
        maxSpawnTime: new Date(now.getTime() + 60_000),
        windowOpenedAt: now,
        updatedAt: now,
      }),
    );

    const publications: string[] = [];

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
          publications.push(routingKey);
        }),
    });

    await boundary.run(
      create(
        { discordId: member.userId, userId: "user" },
        {
          respBaseSeconds: 60,
          world: "world",
          npc: {
            id: 300,
            name: "Hero",
            location: "Map",
            lvl: 100,
            wt: 85,
            icon: "https://micc.garmory-cdn.cloud/obrazki/npc/her/hero.png",
            type: 2,
          },
          accountId: "1",
          characterId: "2",
        },
      ),
    );

    expect(
      await boundary.run(database.select().from(timerHistoryEntryTable)),
    ).toMatchObject([
      { action: TimerHistoryAction.CREATE, npc: { icon: "her/hero.png" } },
    ]);
    expect(
      (await boundary.run(database.select().from(timerTable))).map(
        ({ latestRespBaseSeconds, npc }) => ({ latestRespBaseSeconds, npc }),
      ),
    ).toMatchObject([
      { latestRespBaseSeconds: 60, npc: { icon: "her/hero.png" } },
    ]);
    expect(
      (
        await boundary.run(database.select().from(eventHeroCheckOutboxTable))
      ).map(({ payload }) => payload.npcIcon),
    ).toEqual(["her/hero.png"]);
    expect(publications).toEqual([
      RabbitRoutingKey.GUILDS_TIMERS_UPDATE,
      RabbitRoutingKey.NOTIFICATIONS_TIMER_UPDATED,
    ]);
  } finally {
    await boundary.dispose();
  }
});

it.each([false, true])(
  "retries a committed timer after a Redis failure without duplicating history, publishes it on retry, and accepts the next kill after the dedup window (restored window: %s)",
  async (restoredWindow) => {
    const boundary = await createDatabaseBoundary();

    try {
      const { database } = boundary;
      const guild = createGuildFixture();

      const member = createMemberFixture({
        userId: guild.ownerId,
        globalUserId: "user",
      });

      await boundary.run(database.insert(guildTable).values(guild));
      await boundary.run(database.insert(memberTable).values(member));
      await boundary.run(
        database.insert(userCharactersLootlogSettingsTable).values({
          userId: member.userId,
          accountId: "1",
          characterId: "2",
          catchingGuildIds: [guild.id],
          updatedAt: new Date(),
        }),
      );

      let failCacheWrite = true;
      const publications: string[] = [];

      const create = makeAutoTimer(database, {
        closeKilledNpcGatherings: () => Effect.void,
        get: () => Effect.succeed(null),
        set: () =>
          failCacheWrite
            ? Effect.fail(new RedisError({ cause: "Redis unavailable" }))
            : Effect.void,
        locks: singleFlightLocks(),
        invalidateList: () => Effect.void,
        publishHeroSighting: () => Effect.void,
        signalEventHeroChecks: Effect.void,
        withLock: (_key, operation) => operation,
        publish: (routingKey) =>
          Effect.sync(() => {
            publications.push(routingKey);
          }),
      });

      const request = {
        respBaseSeconds: 60,
        world: "world",
        npc: {
          id: 300,
          name: "Hero",
          location: "Map",
          lvl: 100,
          wt: 85,
          icon: "hero.png",
          type: 2,
        },
        accountId: "1",
        characterId: "2",
      };

      const identity = { discordId: member.userId, userId: "user" };

      const firstResult = await boundary.run(
        create(identity, request).pipe(Effect.result),
      );

      expect(firstResult._tag).toBe("Failure");

      if (restoredWindow) {
        await boundary.run(
          database.update(timerTable).set({
            windowOpenedAt: new Date(Date.now() - 60_000),
          }),
        );
      }

      const acceptedTimers = await boundary.run(
        database.select().from(timerTable),
      );

      expect(acceptedTimers).toHaveLength(1);

      failCacheWrite = false;
      expect(await boundary.run(create(identity, request))).toEqual({
        submittedGuilds: [{ guildId: guild.id, guildName: guild.name }],
        rejectedGuilds: [],
      });
      expect(await boundary.run(database.select().from(timerTable))).toEqual(
        acceptedTimers,
      );
      expect(
        await boundary.run(database.select().from(timerHistoryEntryTable)),
      ).toHaveLength(1);
      expect(
        await boundary.run(database.select().from(eventHeroCheckOutboxTable)),
      ).toHaveLength(1);
      expect(publications).toEqual([
        RabbitRoutingKey.GUILDS_TIMERS_UPDATE,
        RabbitRoutingKey.NOTIFICATIONS_TIMER_UPDATED,
        RabbitRoutingKey.GUILDS_TIMERS_UPDATE,
        RabbitRoutingKey.NOTIFICATIONS_TIMER_UPDATED,
      ]);
      publications.length = 0;

      const previousKill = new Date(Date.now() - 31_000);
      await boundary.run(
        database
          .update(timerHistoryEntryTable)
          .set({ createdAt: previousKill })
          .where(eq(timerHistoryEntryTable.action, TimerHistoryAction.CREATE)),
      );
      await boundary.run(
        database.update(timerTable).set({
          windowOpenedAt: previousKill,
          wasReset: true,
          updatedAt: new Date(),
        }),
      );
      await boundary.run(
        create(identity, { ...request, respBaseSeconds: 120 }),
      );
      expect(
        (await boundary.run(database.select().from(timerTable))).map(
          ({ latestRespBaseSeconds, wasReset }) => ({
            latestRespBaseSeconds,
            wasReset,
          }),
        ),
      ).toEqual([{ latestRespBaseSeconds: 120, wasReset: false }]);
      expect(
        await boundary.run(database.select().from(timerHistoryEntryTable)),
      ).toHaveLength(2);
      expect(publications).toEqual([
        RabbitRoutingKey.GUILDS_TIMERS_UPDATE,
        RabbitRoutingKey.NOTIFICATIONS_TIMER_UPDATED,
      ]);
    } finally {
      await boundary.dispose();
    }
  },
);
