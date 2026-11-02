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
  memberKillBucketTable,
  memberKillTotalTable,
  memberTable,
  userKillBucketTable,
  userKillTotalTable,
} from "../src/database/drizzle/schema.js";
import { makeKillStatsPersistence } from "../src/kills/kill-stats-persistence.js";
import { makeMemberKillQuery } from "../src/kills/member-kill-query.js";
import { makeUserKillQueries } from "../src/kills/user-kill-queries.js";
import type { KillQueryCache } from "../src/kills/kill-query-support.js";
import { applicationLogger } from "../src/shared/application-logger.js";
import { InvalidRequestError } from "../src/shared/http/http-errors.js";

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
        periodStart: periodBoundary,
      };

      // Descriptions come from the latest row at the highest level.
      const killedAt = (secondsAgo: number) =>
        new Date(periodBoundary.getTime() - secondsAgo * 1000);

      const rows = [
        { ...base, lastKilledAt: killedAt(1), world: "a", npcId: 7, kills: 2 },
        {
          ...base,
          lastKilledAt: killedAt(2),
          world: "b",
          npcId: 7,
          kills: 3,
          npcName: "Higher",
          npcType: NpcType.HERO,
          npcLvl: 110,
          npcProf: "m",
          npcIcon: "higher.gif",
        },
        {
          ...base,
          lastKilledAt: killedAt(3),
          world: "c",
          npcId: 7,
          kills: 5,
          npcName: "Tie",
          npcLvl: 110,
        },
        {
          ...base,
          lastKilledAt: killedAt(4),
          world: "d",
          npcId: 7,
          kills: 1,
          npcName: "Lower",
          npcLvl: 90,
        },
        {
          ...base,
          lastKilledAt: killedAt(5),
          world: "a",
          npcId: 8,
          kills: 11,
          npcName: "Higher",
          npcLvl: 80,
          npcProf: null,
          npcIcon: null,
        },
        {
          ...base,
          lastKilledAt: killedAt(6),
          world: "a",
          npcId: 9,
          kills: 30,
          npcName: "Titan",
          npcType: NpcType.TITAN,
          npcLvl: 300,
        },
      ];

      const memberRows = rows.map((row) => ({
        ...row,
        guildId,
        memberId: owner.id,
        discordUserId: userId,
      }));

      const userRows = rows.map((row) => ({ ...row, discordUserId: userId }));

      yield* db.insert(memberKillBucketTable).values(memberRows);
      yield* db
        .insert(memberKillTotalTable)
        .values(memberRows.map(({ periodStart: _start, ...row }) => row));
      yield* db.insert(userKillBucketTable).values(userRows);
      yield* db
        .insert(userKillTotalTable)
        .values(userRows.map(({ periodStart: _start, ...row }) => row));

      const { periodStart: _periodStart, ...described } = base;

      for (const member of members.filter((member) => member.id !== owner.id)) {
        const foreign = {
          ...described,
          lastKilledAt: killedAt(1),
          world: "a",
          npcId: 99,
          guildId: member.guildId,
          memberId: member.id,
          discordUserId: member.userId,
          kills: 999,
        };

        yield* db.insert(memberKillTotalTable).values(foreign);
        yield* db
          .insert(memberKillBucketTable)
          .values({ ...foreign, periodStart: periodBoundary });
      }

      const foreignUser = {
        ...described,
        lastKilledAt: killedAt(1),
        world: "a",
        npcId: 99,
        discordUserId: otherUserId,
        kills: 999,
      };

      yield* db.insert(userKillTotalTable).values(foreignUser);
      yield* db
        .insert(userKillBucketTable)
        .values({ ...foreignUser, periodStart: periodBoundary });

      // Old buckets outside the lifetime totals, as account deletion left them.
      const old = {
        ...described,
        lastKilledAt: new Date("2000-01-01"),
        periodStart: new Date("2000-01-01"),
        world: "old",
        npcId: 7,
        kills: 900,
      };

      yield* db.insert(memberKillBucketTable).values({
        ...old,
        guildId,
        memberId: owner.id,
        discordUserId: userId,
      });
      yield* db
        .insert(userKillBucketTable)
        .values({ ...old, discordUserId: userId });
    }),
  );
});

afterAll(async () => {
  await runtime.runPromise(
    Effect.gen(function* () {
      const db = yield* ApiDatabase;

      for (const table of [
        memberKillBucketTable,
        memberKillTotalTable,
        memberTable,
      ]) {
        yield* db
          .delete(table)
          .where(inArray(table.guildId, [guildId, otherGuildId]));
      }

      for (const table of [userKillBucketTable, userKillTotalTable]) {
        yield* db
          .delete(table)
          .where(inArray(table.discordUserId, [userId, otherUserId]));
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
        const firstQuery = { period, limit: 1 };

        const memberFirst = yield* service.member(
          guildId,
          service.memberId,
          policy,
          [],
          firstQuery,
        );

        const personalFirst = yield* service.personal.getUserNpcKills(
          userId,
          firstQuery,
        );

        expect(memberFirst?.npcs.map((npc) => npc.npcId)).toEqual([9]);
        expect(personalFirst.items.map((npc) => npc.npcId)).toEqual([9]);

        const memberCursor = memberFirst?.nextCursor;
        const personalCursor = personalFirst.nextCursor;

        if (!memberCursor || !personalCursor) {
          throw new Error("Expected a second page");
        }

        const member = yield* service.member(
          guildId,
          service.memberId,
          policy,
          [],
          { ...firstQuery, cursor: memberCursor },
        );

        const personal = yield* service.personal.getUserNpcKills(userId, {
          ...firstQuery,
          cursor: personalCursor,
        });

        const expected = [
          {
            npcId: 7,
            npcName: "Higher",
            npcType: NpcType.HERO,
            npcLvl: 110,
            npcProf: "m",
            npcIcon: "higher.gif",
            totalKills: 11,
          },
        ];

        expect(member?.npcs).toEqual(expected);
        expect(personal.items).toEqual(expected);
        expect(member?.overview).toEqual({
          totalParticipations: 52,
          participationsByType: { ELITE2: 19, HERO: 3, TITAN: 30 },
        });
        expect(member?.total).toBe(3);
        expect(personal.total).toBe(3);

        const personalNext = personal.nextCursor;

        if (!personalNext) throw new Error("Expected a third page");

        // NPCs 7 and 8 tie on kills; the NPC ID tiebreaker keeps 8 next.
        const last = yield* service.personal.getUserNpcKills(userId, {
          ...firstQuery,
          cursor: personalNext,
        });

        expect(last.items).toEqual([
          expect.objectContaining({
            npcId: 8,
            npcName: "Higher",
            npcProf: null,
            npcIcon: null,
            totalKills: 11,
          }),
        ]);
        expect(last.nextCursor).toBeNull();

        const replayed = yield* Effect.flip(
          service.personal.getUserNpcKills(userId, {
            ...firstQuery,
            world: "b",
            cursor: personalNext,
          }),
        );

        expect(replayed).toBeInstanceOf(InvalidRequestError);
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
            npcLevelMin: 105,
            npcLevelMax: 115,
          },
          { period, search: "hIgHeR", npcLevelMin: 105, npcLevelMax: 115 },
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
          expect(personal.items).toEqual(member?.npcs);
          expect(member?.overview).toEqual({
            totalParticipations: 3,
            participationsByType: { HERO: 3 },
          });
          expect(personal.total).toBe(1);
        }
      }),
    );
  });

  test(`empty pages retain the member and filtered summary (${period})`, async () => {
    await runtime.runPromise(
      Effect.gen(function* () {
        const service = yield* services;

        const empty = yield* service.member(
          guildId,
          service.memberId,
          policy,
          [],
          { period, world: "missing" },
        );

        expect(empty?.member?.id).toBe(service.memberId);
        expect(empty?.overview).toEqual({
          totalParticipations: 0,
          participationsByType: {},
        });
        expect(empty?.npcs).toEqual([]);
        expect(empty?.total).toBe(0);
        expect(empty?.nextCursor).toBeNull();

        const personalEmpty = yield* service.personal.getUserNpcKills(userId, {
          period,
          world: "missing",
        });

        expect(personalEmpty.items).toEqual([]);
        expect(personalEmpty.total).toBe(0);
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
        expect(result?.total).toBe(2);

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

        expect(page.items).toHaveLength(3);
        expect(page.items.find((npc) => npc.npcId === 7)?.totalKills).toBe(11);
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

          expect(result.items.map((npc) => npc.npcId)).toEqual([
            ...expectedIds,
          ]);

          // One NPC per page continues the same order, ties included.
          const paged: number[] = [];
          let cursor: string | undefined;

          do {
            const page = yield* service.personal.getUserNpcKills(userId, {
              period,
              sortBy,
              sortOrder,
              limit: 1,
              ...(cursor && { cursor }),
            });

            paged.push(...page.items.map((npc) => npc.npcId));
            cursor = page.nextCursor ?? undefined;
          } while (cursor);

          expect(paged).toEqual([...expectedIds]);
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

      const atBoundary = yield* persistence.findMemberNpcPage(filter, 20);

      expect(atBoundary.totalParticipations).toBe(52);
      expect(atBoundary.total).toBe(3);

      const afterBoundary = yield* persistence.findMemberNpcPage(
        {
          ...filter,
          periodStart: { gte: new Date(periodBoundary.getTime() + 1) },
        },
        20,
      );

      expect(afterBoundary.totalParticipations).toBe(0);
      expect(afterBoundary.npcs).toEqual([]);
    }),
  );
});
