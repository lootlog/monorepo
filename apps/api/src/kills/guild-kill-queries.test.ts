import { describe, expect, it } from "bun:test";
import { createAccessPolicy } from "@lootlog/domain/access-policy";
import { NpcTypeEnum as NpcType } from "@lootlog/schema/npc-type";
import { Permission } from "@lootlog/schema/permissions";
import { createDatabaseBoundary } from "../../test/database-fixtures.js";
import {
  guildKillTotalTable,
  memberKillTotalTable,
} from "#src/database/drizzle/kill-statistics.schema";
import {
  guildTable,
  memberTable,
} from "#src/database/drizzle/organization.schema";
import { applicationLogger as logger } from "#src/shared/application-logger";
import type { KillQueryCache } from "./kill-query-support.js";
import { makeGuildKillQueries } from "./guild-kill-queries.js";
import { makeKillStatsPersistence } from "./kill-stats-persistence.js";

const passthrough: KillQueryCache = {
  getOrSet: (_key, _schema, load) => load,
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
        logger,
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
