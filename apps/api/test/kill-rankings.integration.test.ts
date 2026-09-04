import type { KillQueryCache } from "#src/kills/kill-query-support";
import { afterAll, beforeAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
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
  guildKillSummaryTable,
  guildKillSummaryBucketTable,
} from "../src/database/drizzle/schema.js";
import { makeKillStatsPersistence } from "../src/kills/kill-stats-persistence.js";
import { makeGuildKillQueries } from "../src/kills/guild-kill-queries.js";
import { applicationLogger } from "../src/shared/application-logger.js";

const runtime = ManagedRuntime.make(ApiDatabaseLive);
const guildId = `kill-ranking-${randomUUID()}`;
const otherGuildId = `kill-ranking-${randomUUID()}`;
const policy = createAccessPolicy({ capabilities: [Permission.ADMIN] });
const cache: KillQueryCache = { getOrSet: (_key, _schema, load) => load };
const queries = Effect.map(ApiDatabase, (db) =>
  makeGuildKillQueries(makeKillStatsPersistence(db), cache, applicationLogger),
);

beforeAll(async () => {
  await runtime.runPromise(
    Effect.gen(function* () {
      const db = yield* ApiDatabase;
      yield* db.insert(guildTable).values(
        [guildId, otherGuildId].map((id) => ({
          id,
          name: "Ranking integration",
          ownerId: "owner",
          updatedAt: new Date(),
        })),
      );
      const members = yield* db
        .insert(memberTable)
        .values(
          ["first", "second"].map((name) => ({
            guildId,
            userId: name,
            name,
            updatedAt: new Date(),
          })),
        )
        .returning();
      const [first, second] = members;
      if (!first || !second) throw new Error("Missing fixture members");
      const base = {
        guildId,
        npcId: 1,
        npcName: "Low",
        npcType: NpcType.ELITE2,
        npcLvl: 100,
        npcProf: "w",
        npcIcon: "low.gif",
        updatedAt: new Date(),
      };
      const stats = [
        {
          ...base,
          id: randomUUID(),
          memberId: first.id,
          userId: first.userId,
          world: "a",
          memberKills: 7,
        },
        {
          ...base,
          id: randomUUID(),
          memberId: first.id,
          userId: first.userId,
          world: "b",
          memberKills: 5,
        },
        {
          ...base,
          id: randomUUID(),
          memberId: second.id,
          userId: second.userId,
          world: "a",
          memberKills: 3,
          npcLvl: 200,
          npcName: "High",
          npcIcon: "high.gif",
        },
        {
          ...base,
          id: randomUUID(),
          memberId: second.id,
          userId: second.userId,
          world: "a",
          npcId: 2,
          npcType: NpcType.HERO,
          memberKills: 50,
        },
      ];
      yield* db.insert(npcKillStatsTable).values(stats);
      yield* db.insert(npcKillStatsBucketTable).values(
        stats.map((row) => ({
          ...row,
          id: randomUUID(),
          periodStart: new Date(),
        })),
      );
      yield* db.insert(npcKillStatsBucketTable).values({
        ...stats[0],
        ...base,
        id: randomUUID(),
        memberId: first.id,
        userId: first.userId,
        world: "old",
        memberKills: 900,
        periodStart: new Date("2000-01-01"),
      });
      const summaries = [
        { ...base, id: randomUUID(), world: "a", uniqueKills: 7 },
        {
          ...base,
          id: randomUUID(),
          world: "b",
          uniqueKills: 5,
          npcLvl: 200,
          npcName: "High",
          npcIcon: "high.gif",
        },
        {
          ...base,
          id: randomUUID(),
          world: "a",
          npcId: 2,
          npcType: NpcType.HERO,
          uniqueKills: 50,
        },
        {
          ...base,
          id: randomUUID(),
          guildId: otherGuildId,
          world: "a",
          uniqueKills: 999,
        },
      ];
      yield* db.insert(guildKillSummaryTable).values(summaries);
      yield* db.insert(guildKillSummaryBucketTable).values(
        summaries.map((row) => ({
          ...row,
          id: randomUUID(),
          periodStart: new Date(),
        })),
      );
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
        guildKillSummaryBucketTable,
        guildKillSummaryTable,
        memberTable,
      ]) {
        yield* db
          .delete(table)
          .where(inArray(table.guildId, [guildId, otherGuildId]));
      }
      yield* db
        .delete(guildTable)
        .where(inArray(guildTable.id, [guildId, otherGuildId]));
    }),
  );
  await runtime.dispose();
});

for (const period of ["all", "24h"] as const) {
  test(`SQL rankings preserve cross-world sums, per-type limits and metadata outside the top member (${period})`, async () => {
    await runtime.runPromise(
      Effect.gen(function* () {
        const service = yield* queries;
        const top = yield* service.getGuildTopNpcs(
          guildId,
          policy,
          [],
          1,
          NpcType.ELITE2,
          undefined,
          undefined,
          undefined,
          undefined,
          period,
        );
        expect(top.topNpcs).toEqual([
          expect.objectContaining({
            npcId: 1,
            uniqueKills: 12,
            npcLvl: 200,
            npcName: "High",
          }),
        ]);
        const members = yield* service.getGuildTopKillersByType(
          guildId,
          policy,
          [],
          [NpcType.ELITE2, NpcType.HERO, NpcType.TITAN],
          1,
          period,
        );
        expect(members[NpcType.ELITE2]).toEqual([
          expect.objectContaining({
            memberName: "first",
            totalParticipations: 12,
          }),
        ]);
        expect(members[NpcType.HERO]).toEqual([
          expect.objectContaining({
            memberName: "second",
            totalParticipations: 50,
          }),
        ]);
        expect(members[NpcType.TITAN]).toEqual([]);
        const npc = yield* service.getNpcKillers(
          guildId,
          policy,
          [],
          1,
          1,
          undefined,
          period,
        );
        expect(npc?.npc).toEqual(
          expect.objectContaining({
            npcName: "High",
            npcLvl: 200,
            uniqueGuildKills: 12,
            totalMemberParticipations: 15,
          }),
        );
        expect(npc?.killers).toEqual([
          expect.objectContaining({
            memberName: "first",
            participationCount: 12,
          }),
        ]);
      }),
    );
  });
}

test("filters before ranking and keeps all-time metadata with zero counts for an empty world", async () => {
  await runtime.runPromise(
    Effect.gen(function* () {
      const service = yield* queries;
      const filtered = yield* service.getGuildTopNpcs(
        guildId,
        policy,
        [],
        5,
        NpcType.ELITE2,
        "a",
        "low",
        1,
        150,
      );
      expect(filtered.topNpcs).toEqual([
        expect.objectContaining({ npcName: "Low", uniqueKills: 7 }),
      ]);
      const empty = yield* service.getNpcKillers(
        guildId,
        policy,
        [],
        1,
        1,
        "missing",
        "24h",
      );
      expect(empty?.npc).toEqual(
        expect.objectContaining({
          npcName: "High",
          uniqueGuildKills: 0,
          totalMemberParticipations: 0,
        }),
      );
      expect(empty?.killers).toEqual([]);
      expect(yield* service.getNpcKillers(guildId, policy, [], -1)).toBeNull();
      const db = yield* ApiDatabase;
      const persistence = makeKillStatsPersistence(db);
      const visible = yield* persistence.topMembersByType(
        { guildId, OR: [{ npcType: NpcType.ELITE2, npcLvl: { lte: 150 } }] },
        false,
        1,
      );
      expect(visible).toEqual([
        expect.objectContaining({
          memberName: "first",
          totalParticipations: 12,
        }),
      ]);
    }),
  );
});

test("role visibility restricts totals and metadata before every SQL ranking", async () => {
  await runtime.runPromise(
    Effect.gen(function* () {
      const service = yield* queries;
      const restricted = createAccessPolicy({
        capabilities: [Permission.LOOTLOG_LOOTS_READ],
      });
      const roles = [
        {
          id: "limited",
          guildId,
          name: "Limited",
          color: null,
          position: null,
          permissions: [Permission.LOOTLOG_LOOTS_READ],
          lvlRangeFrom: 0,
          lvlRangeTo: 150,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      const top = yield* service.getGuildTopNpcs(guildId, restricted, roles, 5);
      expect(top.topNpcs).toEqual([
        expect.objectContaining({ npcId: 1, npcLvl: 100, uniqueKills: 7 }),
      ]);
      const members = yield* service.getGuildTopKillersByType(
        guildId,
        restricted,
        roles,
        [NpcType.ELITE2, NpcType.HERO],
      );
      expect(members[NpcType.HERO]).toEqual([]);
      expect(members[NpcType.ELITE2]).toEqual([
        expect.objectContaining({
          memberName: "first",
          totalParticipations: 12,
        }),
      ]);
      const npc = yield* service.getNpcKillers(guildId, restricted, roles, 1);
      expect(npc?.npc).toEqual(
        expect.objectContaining({
          npcLvl: 100,
          totalMemberParticipations: 12,
          uniqueGuildKills: 7,
        }),
      );
      expect(
        yield* service.getNpcKillers(guildId, restricted, roles, 2),
      ).toBeNull();
    }),
  );
});
