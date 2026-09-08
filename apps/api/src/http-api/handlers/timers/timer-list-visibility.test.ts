import { expect, it } from "bun:test";
import { Permission } from "@lootlog/schema/permissions";
import { createDatabaseBoundary } from "../../../../test/database-fixtures.js";
import {
  createGuildFixture,
  createMemberFixture,
} from "../../../../test/organization-fixtures.js";
import {
  guildTable,
  memberTable,
  memberToRoleTable,
  roleTable,
  timerTable,
} from "#src/database/drizzle/schema";
import { makeAllTimerList } from "./timer-list.data-layer.js";

it.each([Permission.ADMIN, Permission.LOOTLOG_TIMERS_READ])(
  "applies all-organization timer visibility for %s",
  async (permission) => {
    const boundary = await createDatabaseBoundary();
    try {
      const database = boundary.database;
      const now = new Date();
      await boundary.run(
        database.insert(guildTable).values([
          createGuildFixture({ id: "organization", ownerId: "other-user" }),
          createGuildFixture({
            id: "hidden-organization",
            ownerId: "other-user",
          }),
        ]),
      );
      await boundary.run(
        database.insert(memberTable).values(
          createMemberFixture({
            guildId: "organization",
            userId: "discord",
            globalUserId: "user",
          }),
        ),
      );
      await boundary.run(
        database.insert(roleTable).values({
          id: "role-1",
          guildId: "organization",
          name: "Role",
          permissions: [permission],
          lvlRangeFrom: 200,
          lvlRangeTo: 500,
          updatedAt: now,
        }),
      );
      await boundary.run(
        database.insert(memberToRoleTable).values({ A: 1, B: "role-1" }),
      );
      await boundary.run(
        database.insert(timerTable).values(
          ["organization", "hidden-organization"].map((guildId) => ({
            guildId,
            createdById: 1,
            npcId: 105,
            timerKey: "105:npc",
            world: "world",
            npc: { id: 105, lvl: 105, type: "HERO", name: "NPC" },
            minSpawnTime: now,
            maxSpawnTime: new Date(now.getTime() + 60_000),
            updatedAt: now,
          })),
        ),
      );
      const timers = await boundary.run(
        makeAllTimerList(database)({ userId: "user", discordId: "discord" }),
      );
      expect(timers.map((entry) => entry.npcId)).toEqual(
        permission === Permission.ADMIN ? [105] : [],
      );
      expect(timers.every((entry) => entry.guildId === "organization")).toBe(
        true,
      );
    } finally {
      await boundary.dispose();
    }
  },
);
