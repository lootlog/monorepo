import { expect, it } from "bun:test";
import { Deferred, Effect, Fiber, Queue } from "effect";
import { eq } from "drizzle-orm";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { Permission } from "@lootlog/schema/permissions";
import { selectAccessibleGuilds } from "#src/members/member-access-query";
import {
  eventHeroNpcTable,
  eventTable,
  guildTable,
  memberTable,
  timerHistoryEntryTable,
  timerTable,
  userCharactersLootlogSettingsTable,
} from "#src/database/drizzle/schema";
import { getSyntheticNpcId } from "#src/events/kills/get-synthetic-npc-id";
import { buildTimerKey } from "#src/timers/timer-key";
import { createDatabaseBoundary } from "../../../../test/database-fixtures.js";
import {
  createGuildFixture,
  createMemberFixture,
} from "../../../../test/organization-fixtures.js";
import { makeAutoTimer } from "./timer-auto.data-layer.js";
import { TimerHistoryAction } from "#src/timers/timers.types";

it("limits independent Organization writes to three, settles delivery pairs, and preserves ordered partial results and deduplication", async () => {
  const boundary = await createDatabaseBoundary();

  try {
    const { database } = boundary;
    const guildIds = ["a", "b", "c", "d", "e", "excluded", "hidden"];
    const targetIds = guildIds.slice(0, 5);
    const now = new Date();
    await boundary.run(
      database.insert(guildTable).values(
        guildIds.map((id) =>
          createGuildFixture({
            id,
            name: id,
            ownerId: id === "hidden" ? "other" : "discord",
          }),
        ),
      ),
    );
    await boundary.run(
      database.insert(memberTable).values(
        guildIds.map((guildId, index) =>
          createMemberFixture({
            id: index + 1,
            guildId,
            userId: "discord",
            globalUserId: "user",
          }),
        ),
      ),
    );
    await boundary.run(
      database.insert(userCharactersLootlogSettingsTable).values({
        userId: "discord",
        accountId: "1",
        characterId: "2",
        catchingGuildIds: [...targetIds, "hidden"],
        updatedAt: now,
      }),
    );

    const accessible = await boundary.run(
      selectAccessibleGuilds(database, "discord", [
        Permission.LOOTLOG_TIMERS_WRITE,
      ]),
    );

    const expectedOrder = accessible
      .map(({ guild }) => guild.id)
      .filter((id) => targetIds.includes(id));

    const failedGuildId = expectedOrder[0];

    if (!failedGuildId) throw new Error("Missing target Organization");

    await boundary.run(
      Effect.gen(function* () {
        const started = yield* Queue.unbounded<string>();
        const releases = new Map<string, Deferred.Deferred<void>>();
        const notificationsStarted = new Map<string, Deferred.Deferred<void>>();

        for (const guildId of targetIds) {
          releases.set(guildId, yield* Deferred.make<void>());
          notificationsStarted.set(guildId, yield* Deferred.make<void>());
        }

        const cache = new Map<string, string>();
        const publications: Array<{ guildId: string; routingKey: string }> = [];
        let active = 0;
        let peak = 0;

        const create = makeAutoTimer(database, {
          get: (key) => Effect.sync(() => cache.get(key) ?? null),
          set: (key, value) => Effect.sync(() => cache.set(key, value)),
          setNx: () => Effect.succeed(true),
          releaseDedup: () => Effect.void,
          invalidateList: () => Effect.void,
          enqueueEventHeroCheck: () => Effect.void,
          withLock: (key, operation) =>
            Effect.gen(function* () {
              const guildId = key.split(":")[2];
              const release = guildId ? releases.get(guildId) : undefined;

              if (!guildId || !release)
                return yield* Effect.die("Unexpected timer lock");
              active += 1;
              peak = Math.max(peak, active);

              return yield* Effect.gen(function* () {
                yield* Queue.offer(started, guildId);
                yield* Deferred.await(release);

                if (guildId === failedGuildId)
                  return yield* Effect.fail("Organization write unavailable");

                return yield* operation;
              }).pipe(
                Effect.ensuring(
                  Effect.sync(() => {
                    active -= 1;
                  }),
                ),
              );
            }),
          publish: (routingKey, payload) =>
            Effect.gen(function* () {
              if (!("guildId" in payload))
                return yield* Effect.die("Unexpected timer publication");
              const ready = notificationsStarted.get(payload.guildId);

              if (!ready) return yield* Effect.die("Unexpected Organization");
              publications.push({ guildId: payload.guildId, routingKey });

              if (routingKey === RabbitRoutingKey.GUILDS_TIMERS_UPDATE) {
                yield* Deferred.await(ready);
              } else {
                yield* Deferred.succeed(ready, undefined);
              }
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

        const operation = create(
          { discordId: "discord", userId: "user" },
          request,
        );

        const fiber = yield* operation.pipe(Effect.forkScoped);
        const first = yield* Queue.take(started);
        const second = yield* Queue.take(started);
        const third = yield* Queue.take(started);
        expect([first, second, third]).toEqual(expectedOrder.slice(0, 3));
        expect(active).toBe(3);

        const release = (guildId: string) => {
          const gate = releases.get(guildId);

          if (!gate) return Effect.die("Missing release");

          return Deferred.succeed(gate, undefined);
        };

        yield* release(third);
        const fourth = yield* Queue.take(started);
        expect(fourth).toBe(expectedOrder[3]);
        yield* release(fourth);
        const fifth = yield* Queue.take(started);
        expect(fifth).toBe(expectedOrder[4]);
        yield* release(fifth);
        yield* release(second);
        yield* release(first);
        const result = yield* Fiber.join(fiber);
        const acceptedIds = expectedOrder.filter((id) => id !== failedGuildId);
        expect(result.submittedGuilds.map(({ guildId }) => guildId)).toEqual(
          acceptedIds,
        );
        expect(result.rejectedGuilds).toEqual([
          {
            guildId: "excluded",
            guildName: "excluded",
            reason: "NOT_ON_CATCHING_WHITELIST",
          },
          {
            guildId: failedGuildId,
            guildName: failedGuildId,
            reason: "TIMER_CREATE_FAILED",
          },
        ]);
        expect(peak).toBe(3);
        expect(publications).toHaveLength(acceptedIds.length * 2);
        expect(
          (yield* database.select().from(timerTable))
            .map(({ guildId }) => guildId)
            .sort(),
        ).toEqual([...acceptedIds].sort());
        expect(yield* operation).toEqual(result);
        expect(publications).toHaveLength(acceptedIds.length * 2);
        expect(
          yield* database.select().from(timerHistoryEntryTable),
        ).toHaveLength(acceptedIds.length);
      }).pipe(Effect.scoped, Effect.timeout("10 seconds")),
    );
  } finally {
    await boundary.dispose();
  }
});

it.each([false, true])(
  "settles synthetic timer deletion before releasing dedup or publishing its replacement (realtime failure: %s)",
  async (failRealtime) => {
    const boundary = await createDatabaseBoundary();

    try {
      const { database } = boundary;
      const guild = createGuildFixture();

      const member = createMemberFixture({
        userId: guild.ownerId,
        globalUserId: "user",
      });

      const now = new Date();
      const syntheticNpcId = getSyntheticNpcId("hero");
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
        database.insert(eventTable).values({
          id: "event",
          guildId: guild.id,
          name: "Event",
          world: "world",
          updatedAt: now,
        }),
      );
      await boundary.run(
        database.insert(eventHeroNpcTable).values({
          id: "hero",
          eventId: "event",
          npcName: "Hero",
        }),
      );
      await boundary.run(
        database.insert(timerTable).values({
          guildId: guild.id,
          world: "world",
          npcId: syntheticNpcId,
          timerKey: buildTimerKey(syntheticNpcId, "Hero"),
          createdById: member.id,
          npc: { id: syntheticNpcId, name: "Hero", lvl: 100, type: "HERO" },
          minSpawnTime: now,
          maxSpawnTime: new Date(now.getTime() + 60_000),
          updatedAt: now,
        }),
      );

      await boundary.run(
        Effect.gen(function* () {
          const started = yield* Queue.unbounded<string>();
          const notificationStarted = yield* Deferred.make<void>();
          const releaseNotification = yield* Deferred.make<void>();
          const publications: string[] = [];
          let dedupReleased = false;

          const create = makeAutoTimer(database, {
            get: () => Effect.succeed(null),
            set: () => Effect.void,
            setNx: () => Effect.succeed(true),
            withLock: (_key, operation) => operation,
            releaseDedup: () =>
              Effect.sync(() => {
                dedupReleased = true;
              }),
            invalidateList: () => Effect.void,
            enqueueEventHeroCheck: () => Effect.void,
            publish: (routingKey) =>
              Effect.gen(function* () {
                publications.push(routingKey);
                yield* Queue.offer(started, routingKey);

                if (routingKey === RabbitRoutingKey.GUILDS_TIMERS_DELETE) {
                  if (failRealtime)
                    return yield* Effect.fail("Realtime delivery unavailable");
                  yield* Deferred.await(notificationStarted);
                }

                if (
                  routingKey === RabbitRoutingKey.NOTIFICATIONS_TIMER_DELETED
                ) {
                  yield* Deferred.succeed(notificationStarted, undefined);
                  yield* Deferred.await(releaseNotification);
                }
              }),
          });

          const fiber = yield* create(
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
                icon: "hero.png",
                type: 2,
              },
              accountId: "1",
              characterId: "2",
            },
          ).pipe(Effect.result, Effect.forkScoped);

          expect(yield* Queue.take(started)).toBe(
            RabbitRoutingKey.GUILDS_TIMERS_DELETE,
          );
          expect(yield* Queue.take(started)).toBe(
            RabbitRoutingKey.NOTIFICATIONS_TIMER_DELETED,
          );
          expect(dedupReleased).toBe(false);
          expect(publications).toHaveLength(2);
          yield* Deferred.succeed(releaseNotification, undefined);
          const result = yield* Fiber.join(fiber);
          expect(result._tag).toBe(failRealtime ? "Failure" : "Success");
          expect(dedupReleased).toBe(true);
          expect(publications).toEqual([
            RabbitRoutingKey.GUILDS_TIMERS_DELETE,
            RabbitRoutingKey.NOTIFICATIONS_TIMER_DELETED,
            ...(failRealtime
              ? []
              : [
                  RabbitRoutingKey.GUILDS_TIMERS_UPDATE,
                  RabbitRoutingKey.NOTIFICATIONS_TIMER_UPDATED,
                ]),
          ]);
          const timers = yield* database.select().from(timerTable);
          expect(timers.map(({ npcId }) => npcId)).toEqual([300]);
          expect(
            yield* database.select().from(timerHistoryEntryTable),
          ).toHaveLength(1);
        }).pipe(Effect.scoped, Effect.timeout("10 seconds")),
      );
    } finally {
      await boundary.dispose();
    }
  },
);

it.each([false, true])(
  "retries a committed timer after a Redis failure without duplicating history, and accepts the next kill after the dedup window (restored window: %s)",
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
        get: () => Effect.succeed(null),
        set: () =>
          failCacheWrite ? Effect.fail("Redis unavailable") : Effect.void,
        setNx: () => Effect.succeed(true),
        releaseDedup: () => Effect.void,
        invalidateList: () => Effect.void,
        enqueueEventHeroCheck: () => Effect.void,
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
        // Restoring an earlier snapshot replaces windowOpenedAt but retains the
        // latest CREATE in history; the pending submission must not undo it.
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
