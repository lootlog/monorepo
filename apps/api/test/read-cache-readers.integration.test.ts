import { afterAll, beforeAll, describe, expect, it, spyOn } from "bun:test";
import type { RedisService } from "#src/redis/redis.service";
import { makeReadCacheFixture } from "./read-cache-fixtures.js";
import { UserLootlogConfigData } from "../src/lootlog-config/user-lootlog-config-data.js";
import { MemberReadData } from "../src/members/members-data.js";
import { makeMemberReadDataLayer } from "../src/members/member-read.data-layer.js";
import { createDatabaseBoundary } from "./database-fixtures.js";
import { randomUUID } from "node:crypto";
import { Effect, ManagedRuntime } from "effect";
import { createAccessPolicy } from "@lootlog/domain/access-policy";
import { Capability } from "@lootlog/schema/permissions";
import { LootStatsService } from "#src/loots/query/loot-stats.service";
import { eq } from "drizzle-orm";
import { ApiDatabase, ApiDatabaseLive } from "#src/database/drizzle/database";
import {
  guildTable,
  memberTable,
  roleTable,
  memberToRoleTable,
} from "#src/database/drizzle/organization.schema";
import {
  lootTable,
  organizationLootRecordTable,
} from "#src/database/drizzle/loot.schema";
import {
  eventTable,
  eventHeroNpcTable,
  eventMapTable,
  eventMapCoverageGapTable,
} from "#src/database/drizzle/event.schema";
import { makeLootsOperations } from "#src/loots/loots.operations";
import { makeLootPersistence } from "#src/loots/loot.repository";
import { makeLootQueryOperations } from "#src/loots/query/loot-query.operations";
import { makeLootQueryPersistence } from "#src/loots/query/loot-query.repository";
import { makeEventsCatalogRead } from "#src/events/catalog/events-catalog-read";
import { makeEventGapReads } from "#src/events/monitoring/event-gap-reads";
import { makeEventReadCache } from "#src/events/catalog/event-read-cache.service";
import { createOrganizationLootRecordFixture } from "./loot-fixtures.js";

const fixture = makeReadCacheFixture();

const { organization } = fixture;

let cache: RedisService;

describe("Read cache Dragonfly readers", () => {
  beforeAll(async () => {
    cache = await fixture.connect();
  });

  afterAll(fixture.close);

  it("refreshes real account and member configuration readers after a character settings update", async () => {
    const databaseRuntime = ManagedRuntime.make(ApiDatabaseLive);

    try {
      await databaseRuntime.runPromise(
        Effect.gen(function* () {
          const db = yield* ApiDatabase;
          const guildId = randomUUID();
          const discordId = randomUUID();
          yield* db.insert(guildTable).values({
            id: guildId,
            name: "Settings cache integration",
            ownerId: discordId,
            updatedAt: new Date(),
          });
          yield* db.insert(memberTable).values({
            guildId,
            userId: discordId,
            globalUserId: randomUUID(),
            name: "Owner",
            updatedAt: new Date(),
          });

          return yield* Effect.gen(function* () {
            const settings = yield* UserLootlogConfigData;
            const members = yield* MemberReadData;
            yield* settings.upsertCharacter(discordId, "1", {
              characterId: "2",
              catchingGuildIds: [guildId],
            });

            for (let read = 0; read < 2; read++) {
              expect(yield* settings.getAccount(discordId, "1")).toMatchObject({
                "2": { catchingGuildIds: [guildId] },
              });
              expect(
                yield* members.getLootlogConfigSummary(guildId, discordId),
              ).toMatchObject({
                enabledCharacterCount: 1,
                characters: [{ enabledForGuild: true }],
              });
            }

            yield* settings.upsertCharacter(discordId, "1", {
              characterId: "2",
              catchingGuildIds: [],
            });
            expect(yield* settings.getAccount(discordId, "1")).toMatchObject({
              "2": { catchingGuildIds: [] },
            });
            expect(
              yield* members.getLootlogConfigSummary(guildId, discordId),
            ).toMatchObject({
              configuredCharacterCount: 0,
              enabledCharacterCount: 0,
              characters: [],
            });
          }).pipe(
            Effect.provide([
              makeMemberReadDataLayer(cache),
              UserLootlogConfigData.layerDatabase({
                getOrSetJsonEffect: cache.getOrSetJson,
                invalidateScopes: cache.invalidateScopes,
              }),
            ]),
          );
        }),
      );
    } finally {
      await databaseRuntime.dispose();
    }
  });

  it("removes lost role access and deactivated members from cached readers", async () => {
    const databaseRuntime = ManagedRuntime.make(ApiDatabaseLive);

    try {
      await databaseRuntime.runPromise(
        Effect.gen(function* () {
          const db = yield* ApiDatabase;
          const guildId = randomUUID();
          const discordId = randomUUID();
          const roleId = randomUUID();
          yield* db.insert(guildTable).values({
            id: guildId,
            name: "Role cache",
            ownerId: "someone-else",
            updatedAt: new Date(),
          });

          const [member] = yield* db
            .insert(memberTable)
            .values({
              guildId,
              userId: discordId,
              globalUserId: randomUUID(),
              name: "Member",
              updatedAt: new Date(),
            })
            .returning();

          if (!member) throw new Error("Missing member fixture");
          yield* db.insert(roleTable).values({
            id: roleId,
            guildId,
            name: "Writer",
            permissions: [
              Capability.LOOTLOG_ACCESS,
              Capability.LOOTLOG_LOOTS_WRITE,
            ],
            updatedAt: new Date(),
          });
          yield* db
            .insert(memberToRoleTable)
            .values({ A: member.id, B: roleId });

          return yield* Effect.gen(function* () {
            const settings = yield* UserLootlogConfigData;
            const members = yield* MemberReadData;

            const invalidate = cache.invalidateScopes(
              `member-read:${guildId}`,
              `user-lootlog-config:${discordId}`,
            );

            yield* settings.upsertCharacter(discordId, "1", {
              characterId: "2",
              catchingGuildIds: [guildId],
            });
            expect(yield* settings.getAccount(discordId, "1")).toMatchObject({
              "2": { catchingGuildIds: [guildId] },
            });
            expect(
              yield* members.getGuildMembersSummary(guildId),
            ).toMatchObject([{ userId: discordId }]);
            expect(
              yield* members.getGuildMemberReferences(guildId, false),
            ).toMatchObject([{ userId: discordId }]);
            yield* db
              .delete(memberToRoleTable)
              .where(eq(memberToRoleTable.A, member.id));
            yield* invalidate;
            expect(yield* settings.getAccount(discordId, "1")).toMatchObject({
              "2": { catchingGuildIds: [] },
            });
            expect(yield* members.getGuildMembersSummary(guildId)).toEqual([]);
            expect(
              yield* members.getGuildMemberReferences(guildId, false),
            ).toMatchObject([{ userId: discordId, active: true }]);
            yield* db
              .update(memberTable)
              .set({ active: false })
              .where(eq(memberTable.id, member.id));
            yield* invalidate;
            expect(
              yield* members.getGuildMemberReferences(guildId, false),
            ).toEqual([]);
            expect(
              yield* members.getGuildMemberReferences(guildId, true),
            ).toMatchObject([{ userId: discordId, active: false }]);
          }).pipe(
            Effect.provide([
              makeMemberReadDataLayer(cache),
              UserLootlogConfigData.layerDatabase({
                getOrSetJsonEffect: cache.getOrSetJson,
                invalidateScopes: cache.invalidateScopes,
              }),
            ]),
          );
        }),
      );
    } finally {
      await databaseRuntime.dispose();
    }
  });

  it("refreshes the real loot-list reader after archiving, with Date values on cache hits", async () => {
    const databaseRuntime = ManagedRuntime.make(ApiDatabaseLive);

    try {
      await databaseRuntime.runPromise(
        Effect.gen(function* () {
          const db = yield* ApiDatabase;

          const [guild] = yield* db
            .insert(guildTable)
            .values({
              id: randomUUID(),
              name: "Cache integration",
              ownerId: "owner",
              updatedAt: new Date(),
            })
            .returning();

          if (!guild) throw new Error("Missing guild fixture");
          yield* db.insert(memberTable).values({
            guildId: guild.id,
            userId: "owner",
            globalUserId: randomUUID(),
            name: "Owner",
            updatedAt: new Date(),
          });

          const [loot] = yield* db
            .insert(lootTable)
            .values({
              gameVersion: "pl",
              uniqueId: randomUUID(),
              world: "test",
              source: "FIGHT",
              location: "Test",
              updatedAt: new Date(),
            })
            .returning();

          if (!loot) throw new Error("Missing loot fixture");
          yield* db.insert(organizationLootRecordTable).values(
            createOrganizationLootRecordFixture({
              guildId: guild.id,
              lootId: loot.id,
              updatedAt: new Date(),
            }),
          );

          const operations = makeLootsOperations({
            signalDrawAnnouncements: Effect.void,
            persistence: makeLootPersistence(db),
            query: makeLootQueryOperations(makeLootQueryPersistence(db)),
            redis: cache,
          });

          const policy = createAccessPolicy({
            capabilities: [Capability.OWNER],
          });

          const request = () =>
            operations.fetchLootsByGuildId(guild, policy, [], {});

          expect((yield* request()).items.map((entry) => entry.id)).toEqual([
            loot.id,
          ]);
          const hit = yield* request();
          expect(hit.items[0]?.createdAt).toBeInstanceOf(Date);
          expect(hit.items[0]?.updatedAt).toBeInstanceOf(Date);
          expect(yield* cache.scan(`loots:list:${guild.id}:*`)).toEqual([]);
          expect(
            yield* cache.scan(`read-cache:v1:*:loots:list:${guild.id}:*`),
          ).toHaveLength(1);
          yield* operations.archiveLoot({
            guild,
            accessPolicy: policy,
            roles: [],
            discordId: "owner",
            lootId: loot.id,
          });
          expect(yield* request()).toEqual({ items: [], nextCursor: null });
        }),
      );
    } finally {
      await databaseRuntime.dispose();
    }
  });

  it("refreshes catalog and coverage readers after event invalidation and revives Dates", async () => {
    const databaseRuntime = ManagedRuntime.make(ApiDatabaseLive);

    try {
      await databaseRuntime.runPromise(
        Effect.gen(function* () {
          const db = yield* ApiDatabase;
          const guildId = randomUUID();
          const eventId = randomUUID();
          const heroId = randomUUID();
          const mapId = randomUUID();
          const gapId = randomUUID();
          yield* db.insert(guildTable).values({
            id: guildId,
            name: "Cache integration",
            ownerId: "owner",
            updatedAt: new Date(),
          });
          yield* db.insert(eventTable).values({
            id: eventId,
            guildId,
            name: "Before",
            world: "test",
            updatedAt: new Date(),
          });
          yield* db
            .insert(eventHeroNpcTable)
            .values({ id: heroId, eventId, npcName: "Hero" });
          yield* db.insert(eventMapTable).values({
            id: mapId,
            heroNpcId: heroId,
            mapId: 1,
            mapName: "Map",
            updatedAt: new Date(),
          });
          yield* db.insert(eventMapCoverageGapTable).values({
            id: gapId,
            mapId,
            heroNpcId: heroId,
            gapType: "UNCOVERED",
            startedAt: new Date(),
          });
          const catalog = makeEventsCatalogRead(db, cache);
          const gaps = makeEventGapReads(db, cache);

          const policy = createAccessPolicy({
            capabilities: [Capability.OWNER],
          });

          const overview = () =>
            catalog.getEvent({ id: guildId }, eventId, [], policy);

          const history = () =>
            gaps.getMapCoverageGaps({ id: guildId }, eventId, mapId);

          expect((yield* overview()).name).toBe("Before");
          expect((yield* history())[0]?.endedAt).toBeNull();
          expect((yield* overview()).createdAt).toBeInstanceOf(Date);
          expect((yield* history())[0]?.startedAt).toBeInstanceOf(Date);
          const endedAt = new Date();
          yield* db
            .update(eventTable)
            .set({ name: "After" })
            .where(eq(eventTable.id, eventId));
          yield* db
            .update(eventMapCoverageGapTable)
            .set({ endedAt })
            .where(eq(eventMapCoverageGapTable.id, gapId));
          yield* makeEventReadCache(cache).invalidateEvent(guildId, eventId);
          expect((yield* overview()).name).toBe("After");
          expect((yield* history())[0]?.endedAt).toEqual(endedAt);
        }),
      );
    } finally {
      await databaseRuntime.dispose();
    }
  });

  it("coalesces concurrent cold loot statistics requests at the SQL boundary", async () => {
    let queries = 0;

    const boundary = await createDatabaseBoundary();

    const unsafe = boundary.database.$client.unsafe.bind(
      boundary.database.$client,
    );

    const querySpy = spyOn(
      boundary.database.$client,
      "unsafe",
    ).mockImplementation((...args) => {
      queries++;

      return unsafe(...args);
    });

    const service = new LootStatsService(boundary.database, cache);

    try {
      const policy = createAccessPolicy({
        capabilities: [Capability.LOOTLOG_LOOTS_READ],
      });

      const request = () =>
        Effect.runPromise(service.getLootStatsEffect(organization, policy, []));

      const responses = await Promise.all(Array.from({ length: 8 }, request));
      expect(queries).toBe(5);
      expect(
        await Effect.runPromise(cache.scan(`loot-stats:${organization}:*`)),
      ).toHaveLength(1);
      expect(
        responses.every(
          (response) =>
            JSON.stringify(response) === JSON.stringify(responses[0]),
        ),
      ).toBe(true);

      await Effect.runPromise(
        cache.invalidateScopes(`loot-stats:${organization}`),
      );
      expect(await request()).toEqual(responses[0]!);
      expect(queries).toBe(5);
    } finally {
      querySpy.mockRestore();
      await boundary.dispose();
    }
  });
});
