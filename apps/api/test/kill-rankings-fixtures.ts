import { NpcTypeEnum as NpcType } from "@lootlog/schema/npc-type";
import { inArray } from "drizzle-orm";
import { Effect, ManagedRuntime } from "effect";
import {
  ApiDatabase,
  ApiDatabaseLive,
} from "../src/database/drizzle/database.js";
import { eventTable } from "../src/database/drizzle/event.schema.js";
import {
  guildTable,
  memberTable,
} from "../src/database/drizzle/organization.schema.js";
import {
  memberKillBucketTable,
  memberKillTotalTable,
  guildKillBucketTable,
  guildKillDayTable,
  guildKillTotalTable,
} from "../src/database/drizzle/kill-statistics.schema.js";

export const makeKillRankingFixture = () => {
  const runtime = ManagedRuntime.make(ApiDatabaseLive);
  const guildId = `kill-ranking-${crypto.randomUUID()}`;
  const otherGuildId = `kill-ranking-${crypto.randomUUID()}`;
  const timelineGuildId = `kill-ranking-${crypto.randomUUID()}`;
  const memberIds = { first: 0, second: 0 };

  const seed = async () => {
    await runtime.runPromise(
      Effect.gen(function* () {
        const db = yield* ApiDatabase;
        yield* db.insert(guildTable).values(
          [guildId, otherGuildId, timelineGuildId].map((id) => ({
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

        memberIds.first = first.id;
        memberIds.second = second.id;

        const base = {
          guildId,
          npcId: 1,
          npcName: "Low",
          npcType: NpcType.ELITE2,
          npcLvl: 100,
          npcProf: "w",
          npcIcon: "low.gif",
          periodStart: new Date(),
          lastKilledAt: new Date(),
        };

        const stats = [
          {
            ...base,
            memberId: first.id,
            discordUserId: first.userId,
            world: "a",
            kills: 7,
          },
          {
            ...base,
            memberId: first.id,
            discordUserId: first.userId,
            world: "b",
            kills: 5,
          },
          {
            ...base,
            memberId: second.id,
            discordUserId: second.userId,
            world: "a",
            kills: 3,
            npcLvl: 200,
            npcName: "High",
            npcIcon: "high.gif",
          },
          {
            ...base,
            memberId: second.id,
            discordUserId: second.userId,
            world: "a",
            npcId: 2,
            npcType: NpcType.HERO,
            kills: 50,
          },
        ];

        const { periodStart: _periodStart, ...described } = base;

        yield* db
          .insert(memberKillTotalTable)
          .values(stats.map(({ periodStart: _start, ...row }) => row));
        yield* db.insert(memberKillBucketTable).values(stats);
        yield* db.insert(memberKillBucketTable).values({
          ...described,
          memberId: first.id,
          discordUserId: first.userId,
          world: "old",
          kills: 900,
          periodStart: new Date("2000-01-01"),
        });

        const summaries = [
          { ...base, world: "a", kills: 7 },
          {
            ...base,
            world: "b",
            kills: 5,
            npcLvl: 200,
            npcName: "High",
            npcIcon: "high.gif",
          },
          {
            ...base,
            world: "a",
            npcId: 2,
            npcType: NpcType.HERO,
            kills: 50,
          },
          {
            ...base,
            guildId: otherGuildId,
            world: "a",
            kills: 999,
          },
        ];

        yield* db
          .insert(guildKillTotalTable)
          .values(summaries.map(({ periodStart: _start, ...row }) => row));
        yield* db.insert(guildKillBucketTable).values(summaries);
      }),
    );
  };

  const cleanup = async () => {
    await runtime.runPromise(
      Effect.gen(function* () {
        const db = yield* ApiDatabase;

        for (const table of [
          eventTable,
          memberKillBucketTable,
          memberKillTotalTable,
          guildKillBucketTable,
          guildKillDayTable,
          guildKillTotalTable,
          memberTable,
        ]) {
          yield* db
            .delete(table)
            .where(
              inArray(table.guildId, [guildId, otherGuildId, timelineGuildId]),
            );
        }

        yield* db
          .delete(guildTable)
          .where(
            inArray(guildTable.id, [guildId, otherGuildId, timelineGuildId]),
          );
      }),
    );
    await runtime.dispose();
  };

  return {
    runtime,
    guildId,
    otherGuildId,
    timelineGuildId,
    memberIds,
    seed,
    cleanup,
  };
};
