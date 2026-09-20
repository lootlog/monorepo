import { afterAll, beforeAll, expect, test } from "bun:test";
import { createAccessPolicy } from "@lootlog/domain/access-policy";
import { NpcTypeEnum as NpcType } from "@lootlog/schema/npc-type";
import { Permission } from "@lootlog/schema/permissions";
import { inArray } from "drizzle-orm";
import { Effect, ManagedRuntime } from "effect";
import {
  ApiDatabase,
  ApiDatabaseLive,
} from "../src/database/drizzle/database.js";
import {
  guildTable,
  memberTable,
  npcKillStatsTable,
  npcKillStatsBucketTable,
  userKillStatsTable,
  userKillStatsBucketTable,
} from "../src/database/drizzle/schema.js";
import { makeKillStatsPersistence } from "../src/kills/kill-stats-persistence.js";
import { makeMemberKillQuery } from "../src/kills/member-kill-query.js";
import { makeUserKillQueries } from "../src/kills/user-kill-queries.js";
import type { KillQueryCache } from "../src/kills/kill-query-support.js";
import { applicationLogger } from "../src/shared/application-logger.js";

const periodBoundary = new Date();

const runtime = ManagedRuntime.make(ApiDatabaseLive);

const guildId = `npc-page-${crypto.randomUUID()}`;

const otherGuildId = `${guildId}-other`;

const userId = `${guildId}-user`;

const otherUserId = `${userId}-other`;

const policy = createAccessPolicy({ capabilities: [Permission.ADMIN] });

const restricted = createAccessPolicy({
  capabilities: [Permission.LOOTLOG_LOOTS_READ],
});

const cache: KillQueryCache = { getOrSet: (_key, _schema, load) => load };

const services = Effect.gen(function* () {
  const db = yield* ApiDatabase;
  const persistence = makeKillStatsPersistence(db);

  const member = yield* db
    .select()
    .from(memberTable)
    .where(inArray(memberTable.userId, [userId]));

  const owner = member.find((row) => row.guildId === guildId);

  if (!owner) throw new Error("Missing member fixture");

  return {
    memberId: owner.id,
    member: makeMemberKillQuery(persistence, cache, applicationLogger),
    personal: makeUserKillQueries(db, cache, applicationLogger),
  };
});

beforeAll(async () => {
  await runtime.runPromise(
    Effect.gen(function* () {
      const db = yield* ApiDatabase;
      yield* db.insert(guildTable).values(
        [guildId, otherGuildId].map((id) => ({
          id,
          name: "NPC page integration",
          ownerId: "owner",
          updatedAt: new Date(),
        })),
      );

      const members = yield* db
        .insert(memberTable)
        .values([
          { guildId, userId, name: "Owner", updatedAt: new Date() },
          {
            guildId,
            userId: otherUserId,
            name: "Other member",
            updatedAt: new Date(),
          },
          {
            guildId: otherGuildId,
            userId,
            name: "Other organization",
            updatedAt: new Date(),
          },
        ])
        .returning();

      const owner = members.find(
        (member) => member.guildId === guildId && member.userId === userId,
      );

      if (!owner) throw new Error("Missing inserted owner");

      const base = {
        npcName: "Earlier",
        npcType: NpcType.ELITE2,
        npcLvl: 100,
        npcProf: "w",
        npcIcon: "first.gif",
        updatedAt: new Date(),
      };

      const rows = [
        { ...base, id: `${guildId}-01`, world: "a", npcId: 7, totalKills: 2 },
        {
          ...base,
          id: `${guildId}-02`,
          world: "b",
          npcId: 7,
          totalKills: 3,
          npcName: "Higher",
          npcType: NpcType.HERO,
          npcLvl: 110,
          npcProf: "m",
          npcIcon: "higher.gif",
        },
        {
          ...base,
          id: `${guildId}-03`,
          world: "c",
          npcId: 7,
          totalKills: 5,
          npcName: "Tie",
          npcLvl: 110,
        },
        {
          ...base,
          id: `${guildId}-04`,
          world: "d",
          npcId: 7,
          totalKills: 1,
          npcName: "Lower",
          npcLvl: 90,
        },
        {
          ...base,
          id: `${guildId}-05`,
          world: "a",
          npcId: 8,
          totalKills: 11,
          npcName: "Higher",
          npcLvl: 80,
          npcProf: null,
          npcIcon: null,
        },
        {
          ...base,
          id: `${guildId}-06`,
          world: "a",
          npcId: 9,
          totalKills: 30,
          npcName: "Titan",
          npcType: NpcType.TITAN,
          npcLvl: 300,
        },
      ];

      const memberRows = rows.map(({ totalKills, ...row }) => ({
        ...row,
        guildId,
        memberId: owner.id,
        userId,
        memberKills: totalKills,
      }));

      yield* db.insert(npcKillStatsTable).values(memberRows);
      yield* db
        .insert(npcKillStatsBucketTable)
        .values(
          memberRows.map((row) => ({ ...row, periodStart: periodBoundary })),
        );
      yield* db
        .insert(userKillStatsTable)
        .values(rows.map((row) => ({ ...row, userId })));
      yield* db
        .insert(userKillStatsBucketTable)
        .values(
          rows.map((row) => ({ ...row, userId, periodStart: periodBoundary })),
        );

      for (const member of members.filter((member) => member.id !== owner.id)) {
        const foreign = {
          ...base,
          id: crypto.randomUUID(),
          world: "a",
          npcId: 99,
          guildId: member.guildId,
          memberId: member.id,
          userId: member.userId,
          memberKills: 999,
        };

        yield* db.insert(npcKillStatsTable).values(foreign);
        yield* db
          .insert(npcKillStatsBucketTable)
          .values({ ...foreign, periodStart: periodBoundary });
      }

      const foreignUser = {
        ...base,
        id: crypto.randomUUID(),
        world: "a",
        npcId: 99,
        userId: otherUserId,
        totalKills: 999,
      };

      yield* db.insert(userKillStatsTable).values(foreignUser);
      yield* db
        .insert(userKillStatsBucketTable)
        .values({ ...foreignUser, periodStart: periodBoundary });

      const old = {
        ...base,
        id: crypto.randomUUID(),
        world: "old",
        npcId: 7,
        periodStart: new Date("2000-01-01"),
      };

      yield* db.insert(npcKillStatsBucketTable).values({
        ...old,
        guildId,
        memberId: owner.id,
        userId,
        memberKills: 900,
      });
      yield* db
        .insert(userKillStatsBucketTable)
        .values({ ...old, userId, totalKills: 900 });
    }),
  );
});

afterAll(async () => {
  await runtime.runPromise(
    Effect.gen(function* () {
      const db = yield* ApiDatabase;

      for (const table of [
        npcKillStatsBucketTable,
        npcKillStatsTable,
        memberTable,
      ]) {
        yield* db
          .delete(table)
          .where(inArray(table.guildId, [guildId, otherGuildId]));
      }

      for (const table of [userKillStatsBucketTable, userKillStatsTable]) {
        yield* db
          .delete(table)
          .where(inArray(table.userId, [userId, otherUserId]));
      }

      yield* db
        .delete(guildTable)
        .where(inArray(guildTable.id, [guildId, otherGuildId]));
    }),
  );
  await runtime.dispose();
});

for (const period of ["all", "24h"] as const) {
  test(`member and personal NPC pages aggregate before pagination and preserve snapshot metadata (${period})`, async () => {
    await runtime.runPromise(
      Effect.gen(function* () {
        const service = yield* services;
        const query = { period, cursor: 1, limit: 1 };

        const member = yield* service.member(
          guildId,
          service.memberId,
          policy,
          [],
          query,
        );

        const personal = yield* service.personal.getUserNpcKills(userId, query);

        const expected = [
          {
            npcId: 7,
            npcName: "Higher",
            npcType: NpcType.ELITE2,
            npcLvl: 110,
            npcProf: "m",
            npcIcon: "higher.gif",
            totalKills: 11,
          },
        ];

        expect(member?.npcs).toEqual(expected);
        expect(personal.npcs).toEqual(expected);
        expect(member?.overview).toEqual({
          totalParticipations: 52,
          participationsByType: { ELITE2: 19, HERO: 3, TITAN: 30 },
        });
        expect(member?.pagination).toEqual({
          total: 3,
          cursor: 1,
          limit: 1,
          hasNext: true,
        });
        expect(personal.pagination).toEqual(member?.pagination);

        const last = yield* service.personal.getUserNpcKills(userId, {
          period,
          cursor: 2,
          limit: 1,
        });

        expect(last.npcs).toEqual([
          expect.objectContaining({
            npcId: 8,
            npcName: "Higher",
            npcProf: null,
            npcIcon: null,
            totalKills: 11,
          }),
        ]);
        expect(last.pagination.hasNext).toBe(false);
      }),
    );
  });

  test(`filters source rows before merging metadata, totals and page counts (${period})`, async () => {
    await runtime.runPromise(
      Effect.gen(function* () {
        const service = yield* services;

        for (const query of [
          {
            period,
            world: "b",
            search: "hIgHeR",
            npcTypes: [NpcType.HERO],
            minLvl: 105,
            maxLvl: 115,
          },
          { period, search: "hIgHeR", minLvl: 105, maxLvl: 115 },
        ]) {
          const member = yield* service.member(
            guildId,
            service.memberId,
            policy,
            [],
            query,
          );

          const personal = yield* service.personal.getUserNpcKills(
            userId,
            query,
          );

          expect(member?.npcs).toEqual([
            expect.objectContaining({
              npcId: 7,
              npcType: NpcType.HERO,
              npcName: "Higher",
              totalKills: 3,
            }),
          ]);
          expect(personal.npcs).toEqual(member?.npcs);
          expect(member?.overview).toEqual({
            totalParticipations: 3,
            participationsByType: { HERO: 3 },
          });
          expect(personal.pagination.total).toBe(1);
        }
      }),
    );
  });

  test(`empty and out-of-range pages retain the member and filtered summary (${period})`, async () => {
    await runtime.runPromise(
      Effect.gen(function* () {
        const service = yield* services;

        const pastEnd = yield* service.member(
          guildId,
          service.memberId,
          policy,
          [],
          { period, cursor: 50, limit: 2 },
        );

        expect(pastEnd?.npcs).toEqual([]);
        expect(pastEnd?.overview?.totalParticipations).toBe(52);
        expect(pastEnd?.pagination).toEqual({
          total: 3,
          cursor: 50,
          limit: 2,
          hasNext: false,
        });

        const personalPastEnd = yield* service.personal.getUserNpcKills(
          userId,
          { period, cursor: 50, limit: 2 },
        );

        expect(personalPastEnd.npcs).toEqual([]);
        expect(personalPastEnd.pagination).toEqual(pastEnd?.pagination);

        const empty = yield* service.member(
          guildId,
          service.memberId,
          policy,
          [],
          { period, world: "missing" },
        );

        expect(empty?.member?.memberId).toBe(service.memberId);
        expect(empty?.overview).toEqual({
          totalParticipations: 0,
          participationsByType: {},
        });
        expect(empty?.npcs).toEqual([]);
        expect(empty?.pagination?.total).toBe(0);

        const personalEmpty = yield* service.personal.getUserNpcKills(userId, {
          period,
          world: "missing",
        });

        expect(personalEmpty.npcs).toEqual([]);
        expect(personalEmpty.pagination.total).toBe(0);
        expect(
          yield* service.member(otherGuildId, service.memberId, policy, [], {
            period,
          }),
        ).toBeNull();
      }),
    );
  });

  test(`visibility removes hidden source counts and metadata from member pages (${period})`, async () => {
    await runtime.runPromise(
      Effect.gen(function* () {
        const service = yield* services;

        const roles = [
          {
            id: "limited",
            guildId,
            name: "Limited",
            color: null,
            position: null,
            permissions: [Permission.LOOTLOG_LOOTS_READ],
            lvlRangeFrom: 0,
            lvlRangeTo: 100,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        const result = yield* service.member(
          guildId,
          service.memberId,
          restricted,
          roles,
          { period },
        );

        expect(result?.overview).toEqual({
          totalParticipations: 14,
          participationsByType: { ELITE2: 14 },
        });
        expect(result?.npcs).toEqual([
          expect.objectContaining({ npcId: 8, totalKills: 11 }),
          expect.objectContaining({
            npcId: 7,
            npcName: "Earlier",
            npcLvl: 100,
            totalKills: 3,
          }),
        ]);
        expect(result?.pagination?.total).toBe(2);

        const denied = yield* service.member(
          guildId,
          service.memberId,
          restricted,
          [],
          { period },
        );

        expect(denied?.npcs).toEqual([]);
        expect(denied?.overview).toEqual({
          totalParticipations: 0,
          participationsByType: {},
        });
      }),
    );
  });

  test(`personal overview retains world-specific NPC groups while pages merge worlds (${period})`, async () => {
    await runtime.runPromise(
      Effect.gen(function* () {
        const service = yield* services;

        const overview = yield* service.personal.getUserKillStats(userId, {
          period,
          topNpcsLimit: 10,
        });

        expect(overview.overview).toEqual({
          totalKills: 52,
          killsByType: { ELITE2: 19, HERO: 3, TITAN: 30 },
          killsByWorld: { a: 43, b: 3, c: 5, d: 1 },
        });
        expect(overview.topNpcs).toHaveLength(6);
        expect(
          overview.topNpcs
            .filter((npc) => npc.npcId === 7)
            .map((npc) => npc.totalKills),
        ).toEqual([5, 3, 2, 1]);

        const page = yield* service.personal.getUserNpcKills(userId, {
          period,
        });

        expect(page.npcs).toHaveLength(3);
        expect(page.npcs.find((npc) => npc.npcId === 7)?.totalKills).toBe(11);
      }),
    );
  });

  test(`personal sorting ranks aggregate counts and levels in both directions (${period})`, async () => {
    await runtime.runPromise(
      Effect.gen(function* () {
        const service = yield* services;

        for (const [sortBy, sortOrder, expectedIds] of [
          ["kills", "desc", [9, 7, 8]],
          ["kills", "asc", [7, 8, 9]],
          ["level", "desc", [9, 7, 8]],
          ["level", "asc", [8, 7, 9]],
        ] as const) {
          const result = yield* service.personal.getUserNpcKills(userId, {
            period,
            sortBy,
            sortOrder,
          });

          expect(result.npcs.map((npc) => npc.npcId)).toEqual([...expectedIds]);
        }
      }),
    );
  });
}

test("member bucket pages include the exact period boundary and exclude earlier history", async () => {
  await runtime.runPromise(
    Effect.gen(function* () {
      const service = yield* services;
      const persistence = makeKillStatsPersistence(yield* ApiDatabase);

      const filter = {
        guildId,
        memberId: service.memberId,
        periodStart: { gte: periodBoundary },
      };

      const atBoundary = yield* persistence.findMemberNpcPage(
        filter,
        true,
        20,
        0,
      );

      expect(atBoundary.totalParticipations).toBe(52);
      expect(atBoundary.total).toBe(3);

      const afterBoundary = yield* persistence.findMemberNpcPage(
        {
          ...filter,
          periodStart: { gte: new Date(periodBoundary.getTime() + 1) },
        },
        true,
        20,
        0,
      );

      expect(afterBoundary.totalParticipations).toBe(0);
      expect(afterBoundary.npcs).toEqual([]);
    }),
  );
});
