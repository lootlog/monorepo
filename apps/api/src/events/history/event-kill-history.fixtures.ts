import { Effect } from "effect";
import { zip } from "es-toolkit";
import { createAccessPolicy } from "@lootlog/domain/access-policy";
import { Capability } from "@lootlog/schema/permissions";
import { createDatabaseBoundary } from "../../../test/database-fixtures.js";
import {
  createGuildFixture,
  createMemberFixture,
} from "../../../test/organization-fixtures.js";
import {
  eventHeroKillTable,
  eventHeroNpcTable,
  eventKillPointTable,
  eventTable,
} from "#src/database/drizzle/event.schema";
import {
  guildTable,
  memberTable,
  type roleTable,
} from "#src/database/drizzle/organization.schema";
import { makeEventReadCache } from "#src/events/catalog/event-read-cache.service";
import { makeEventAccess } from "#src/events/event-access";
import { makeEventEmitter } from "#src/events/event-emitter";
import { makeEventPointsStore } from "#src/events/kills/event-points.repository";
import { makeEventPoints } from "#src/events/kills/event-points.service";
import type { RedisGetOrSetJsonOptions } from "#src/redis/redis.service";
import { makeEventKillHistory } from "#src/events/history/event-kill-history";

export const time = (value: string) => new Date(`2026-09-27T${value}:00.000Z`);

export const uuid = (value: string) =>
  `${value.padStart(8, "0")}-1111-4111-8111-111111111111`;

const legacyId = (value: string) => `cm${value.padStart(23, "0")}`;

export const orderedIds = [
  uuid("f"),
  legacyId("a"),
  legacyId("d"),
  legacyId("b"),
  uuid("c"),
] as const;

export const hiddenId = uuid("ee");

const otherEventId = uuid("dd");

const foreignId = uuid("cc");

const role = (maximum: number): typeof roleTable.$inferSelect => ({
  id: "reader",
  guildId: "guild-1",
  name: "Reader",
  color: null,
  position: null,
  permissions: [Capability.LOOTLOG_EVENTS_READ],
  lvlRangeFrom: 1,
  lvlRangeTo: maximum,
  createdAt: time("00:00"),
  updatedAt: time("00:00"),
});

export const context = (maximum = 100) => ({
  guildId: "guild-1",
  eventId: "event-1",
  roles: [role(maximum)],
  accessPolicy: createAccessPolicy({
    capabilities: [Capability.LOOTLOG_EVENTS_READ],
  }),
});

export const fixture = async () => {
  const boundary = await createDatabaseBoundary();
  const database = boundary.database;

  const entries = new Map<
    string,
    { value: string; scopes: readonly string[] }
  >();

  const redis = {
    invalidateScopes: (...scopes: string[]) =>
      Effect.sync(() => {
        for (const [key, entry] of entries) {
          if (entry.scopes.some((scope) => scopes.includes(scope))) {
            entries.delete(key);
          }
        }
      }),
    deleteByPattern: () => Effect.succeed(0),
    getOrSetJson<T, E>(options: RedisGetOrSetJsonOptions<T, E>) {
      return Effect.gen(function* () {
        const cached = entries.get(options.key);

        if (cached !== undefined) return options.codec.parse(cached.value);
        const value = yield* options.factory;
        entries.set(options.key, {
          value: options.codec.stringify(value),
          scopes: options.scopes ?? [],
        });

        return value;
      });
    },
  };

  const readCache = makeEventReadCache(redis);

  const points = makeEventPoints(
    makeEventPointsStore(database),
    makeEventEmitter({
      publish: () => Effect.die("History must not publish events"),
    }),
    readCache,
  );

  const history = makeEventKillHistory({
    database,
    eventAccess: makeEventAccess(database),
    readCache,
    points,
  });

  try {
    await boundary.run(
      Effect.gen(function* () {
        yield* database
          .insert(guildTable)
          .values([
            createGuildFixture(),
            createGuildFixture({ id: "guild-2" }),
          ]);
        yield* database.insert(memberTable).values([
          createMemberFixture(),
          createMemberFixture({ id: 2, userId: "user-2", name: "Second" }),
          createMemberFixture({
            id: 3,
            guildId: "guild-2",
            userId: "user-3",
          }),
        ]);
        yield* database.insert(eventTable).values([
          {
            id: "event-1",
            guildId: "guild-1",
            name: "Event",
            world: "Aldous",
            updatedAt: time("00:00"),
          },
          {
            id: "event-2",
            guildId: "guild-1",
            name: "Other event",
            world: "Aldous",
            updatedAt: time("00:00"),
          },
          {
            id: "event-3",
            guildId: "guild-2",
            name: "Other Organization",
            world: "Aldous",
            updatedAt: time("00:00"),
          },
        ]);
        yield* database.insert(eventHeroNpcTable).values([
          { id: "low", eventId: "event-1", npcName: "Low", npcLvl: 50 },
          { id: "high", eventId: "event-1", npcName: "High", npcLvl: 300 },
          { id: "other", eventId: "event-2", npcName: "Other", npcLvl: 50 },
          { id: "foreign", eventId: "event-3", npcName: "Foreign", npcLvl: 50 },
        ]);
        yield* database.insert(eventHeroKillTable).values([
          ...zip(orderedIds, ["12:00", "11:00", "10:00", "10:00", "09:00"]).map(
            ([id, killedAt]) => ({
              id,
              heroNpcId: "low",
              killedAt: time(killedAt),
              minSpawnTimeAtKill: time("08:00"),
              maxSpawnTimeAtKill: time("13:00"),
            }),
          ),
          ...[
            { id: hiddenId, heroNpcId: "high" },
            { id: otherEventId, heroNpcId: "other" },
            { id: foreignId, heroNpcId: "foreign" },
          ].map((kill) => ({
            ...kill,
            killedAt: time("13:00"),
            minSpawnTimeAtKill: time("08:00"),
            maxSpawnTimeAtKill: time("13:00"),
          })),
        ]);
        yield* database.insert(eventKillPointTable).values(
          [
            ...orderedIds.map((killId, index) => ({
              killId,
              memberId: 2,
              wasPresent: index !== 0,
            })),
            ...[
              orderedIds[0],
              orderedIds[2],
              orderedIds[4],
              hiddenId,
              otherEventId,
            ].map((killId) => ({ killId, memberId: 1, wasPresent: true })),
            { killId: foreignId, memberId: 3, wasPresent: true },
          ].map((point, index) => ({
            ...point,
            id: `point-${index}`,
            basePoints: 1,
            points: 7.25,
            manualAdjustmentPoints: 2,
            timeOnMapSeconds: 120,
            afkPercentage: 0,
            trackingDurationSeconds: 240,
            trackingDurationPercentage: 40,
          })),
        );
      }),
    );

    return { ...boundary, history, points, readCache, redis };
  } catch (cause) {
    await boundary.dispose();
    throw cause;
  }
};
