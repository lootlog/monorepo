import { describe, expect, it } from "bun:test";
import { createAccessPolicy } from "@lootlog/domain/access-policy";
import { NpcTypeEnum as NpcType } from "@lootlog/schema/npc-type";
import { Permission } from "@lootlog/schema/permissions";
import { createDatabaseBoundary } from "../../test/database-fixtures.js";
import { createGuildFixture } from "../../test/organization-fixtures.js";
import {
  guildKillDayTable,
  guildKillTotalTable,
  memberKillTotalTable,
} from "#src/database/drizzle/kill-statistics.schema";
import {
  guildTable,
  memberTable,
} from "#src/database/drizzle/organization.schema";
import { Effect } from "effect";
import type { StaleKillQueryCache } from "./kill-query-support.js";
import { makeGuildKillQueries } from "./guild-kill-queries.js";
import { makeKillStatsPersistence } from "./kill-stats-persistence.js";

const passthrough: StaleKillQueryCache = {
  getOrSetStale: (_key, _schema, load) =>
    Effect.map(load, (value) => ({
      value,
      computedAt: "2026-10-01T12:00:00.000Z",
    })),
};

const policy = createAccessPolicy({ capabilities: [Permission.OWNER] });

describe("guild kill rankings", () => {
  it("return their documented default size when the query omits a limit", async () => {
    const boundary = await createDatabaseBoundary();
    const guildId = "organization";
    const lastKilledAt = new Date("2026-10-01T12:00:00Z");

    const npc = (npcId: number, kills: number) => ({
      guildId,
      world: "tempest",
      npcId,
      npcName: `NPC ${npcId}`,
      npcType: NpcType.HERO,
      npcLvl: 100,
      kills,
      lastKilledAt,
    });

    try {
      await boundary.run(
        boundary.database.insert(guildTable).values({
          id: guildId,
          name: "Organization",
          ownerId: "owner",
          updatedAt: lastKilledAt,
        }),
      );

      const members = await boundary.run(
        boundary.database
          .insert(memberTable)
          .values(
            Array.from({ length: 7 }, (_, index) => ({
              guildId,
              userId: `user-${index}`,
              name: `member-${index}`,
              updatedAt: lastKilledAt,
            })),
          )
          .returning(),
      );

      await boundary.run(
        boundary.database
          .insert(guildKillTotalTable)
          .values(
            Array.from({ length: 12 }, (_, index) => npc(index + 1, index + 1)),
          ),
      );
      await boundary.run(
        boundary.database.insert(memberKillTotalTable).values(
          members.map((member, index) => ({
            ...npc(1, index + 1),
            memberId: member.id,
            discordUserId: member.userId,
          })),
        ),
      );

      const queries = makeGuildKillQueries(
        makeKillStatsPersistence(boundary.database),
        passthrough,
      );

      const top = await boundary.run(
        queries.getGuildTopNpcs(guildId, policy, [], { period: "all" }),
      );

      expect(top.topNpcs.map((entry) => entry.npcId)).toEqual([
        12, 11, 10, 9, 8, 7, 6, 5, 4, 3,
      ]);

      const killers = await boundary.run(
        queries.getGuildTopKillersByType(guildId, policy, [], [NpcType.HERO], {
          period: "all",
        }),
      );

      expect(killers[NpcType.HERO]?.map((entry) => entry.member.name)).toEqual([
        "member-6",
        "member-5",
        "member-4",
        "member-3",
        "member-2",
      ]);
    } finally {
      await boundary.dispose();
    }
  });
});

describe("all-time weekday heatmap", () => {
  it("lists only the hours that have kills", async () => {
    const boundary = await createDatabaseBoundary();

    try {
      await boundary.run(
        boundary.database
          .insert(guildTable)
          .values(createGuildFixture({ id: "organization" })),
      );
      await boundary.run(
        boundary.database.insert(guildKillDayTable).values({
          guildId: "organization",
          world: "tempest",
          npcId: 1,
          day: "2026-07-16",
          npcName: "NPC",
          npcType: NpcType.HERO,
          npcLvl: 100,
          kills: 3,
          hours: Array.from({ length: 24 }, (_, hour) => (hour === 5 ? 3 : 0)),
        }),
      );

      const cells = await boundary.run(
        makeKillStatsPersistence(boundary.database).guildKillHourlyWeekday({
          guildId: "organization",
        }),
      );

      // 2026-07-16 is a Thursday.
      expect(cells).toEqual([{ weekday: 4, hour: 5, kills: 3 }]);
    } finally {
      await boundary.dispose();
    }
  });
});
