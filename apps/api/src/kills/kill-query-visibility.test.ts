import { Database, type SQLQueryBindings } from "bun:sqlite";
import { describe, expect, it } from "bun:test";
import { createAccessPolicy, Capability } from "@lootlog/domain/access-policy";
import { Permission } from "@lootlog/schema/permissions";
import { PgDialect } from "drizzle-orm/pg-core";
import { npcKillStatsTable } from "#src/database/drizzle/schema";
import {
  readableRoles,
  visibilityFilter,
  type KillQueryRole,
} from "./kill-query-support.js";
import { buildKillStatsCondition } from "./kill-stats-persistence.js";

const role = (
  permissions: KillQueryRole["permissions"],
  lvlRangeFrom = 200,
  lvlRangeTo = 500,
): KillQueryRole => ({
  id: crypto.randomUUID(),
  guildId: "organization",
  name: "Role",
  color: null,
  position: null,
  permissions,
  lvlRangeFrom,
  lvlRangeTo,
  createdAt: new Date(0),
  updatedAt: new Date(0),
});

// These predicates use SQL shared by PostgreSQL and SQLite. Execute the actual
// Drizzle predicate so a missing WHERE clause cannot masquerade as denied access.
const visibleNpcIds = (roles: KillQueryRole[], administrative = false) => {
  const database = new Database(":memory:");
  try {
    database.exec(`
      CREATE TABLE "NpcKillStats" (
        "guildId" TEXT, "npcId" INTEGER, "npcLvl" INTEGER, "npcType" TEXT
      );
      INSERT INTO "NpcKillStats" VALUES
        ('organization', 1, 105, 'ELITE2'),
        ('organization', 2, 200, 'ELITE2'),
        ('organization', 3, 500, 'ELITE2'),
        ('organization', 4, 501, 'ELITE2'),
        ('organization', 5, 250, 'HERO'),
        ('organization', 6, 250, 'EVENT_HERO'),
        ('organization', 7, 250, 'TITAN'),
        ('other-organization', 8, 250, 'ELITE2');
    `);
    const policy = createAccessPolicy({
      capabilities: administrative ? [Capability.ADMIN] : [],
    });
    const condition = buildKillStatsCondition(
      {
        guildId: npcKillStatsTable.guildId,
        world: npcKillStatsTable.world,
        npcLvl: npcKillStatsTable.npcLvl,
        npcName: npcKillStatsTable.npcName,
        npcType: npcKillStatsTable.npcType,
      },
      {
        guildId: "organization",
        ...visibilityFilter(policy, readableRoles(roles)),
      },
    );
    if (!condition) throw new Error("Missing organization predicate");
    const query = new PgDialect().sqlToQuery(condition);
    const parameters = query.params.map((value) => {
      if (typeof value === "string" || typeof value === "number") return value;
      throw new Error("Unexpected visibility query parameter");
    });
    return database
      .query<{ npcId: number }, SQLQueryBindings[]>(
        `SELECT "npcId" FROM "NpcKillStats" WHERE ${query.sql} ORDER BY "npcId"`,
      )
      .all(...parameters)
      .map(({ npcId }) => npcId);
  } finally {
    database.close();
  }
};

describe("kill query visibility at the SQL boundary", () => {
  it("returns no NPCs when organization access grants no loot read role", () => {
    expect(visibleNpcIds([role([Permission.LOOTLOG_ACCESS])])).toEqual([]);
    expect(visibleNpcIds([])).toEqual([]);
  });

  it("keeps empty broad roles from extending inclusive readable ranges", () => {
    expect(
      visibleNpcIds([role([Permission.LOOTLOG_LOOTS_READ]), role([], 0, 500)]),
    ).toEqual([2, 3]);
  });

  it("requires the special NPC permission on the role covering its level", () => {
    expect(
      visibleNpcIds([
        role([Permission.LOOTLOG_LOOTS_READ]),
        role([
          Permission.LOOTLOG_LOOTS_HEROES_READ,
          Permission.LOOTLOG_LOOTS_TITANS_READ,
        ]),
        role(
          [
            Permission.LOOTLOG_LOOTS_READ,
            Permission.LOOTLOG_LOOTS_HEROES_READ,
            Permission.LOOTLOG_LOOTS_TITANS_READ,
          ],
          300,
          500,
        ),
      ]),
    ).toEqual([2, 3]);
  });

  it("allows special NPCs within a complete role's range", () => {
    expect(
      visibleNpcIds([
        role([
          Permission.LOOTLOG_LOOTS_READ,
          Permission.LOOTLOG_LOOTS_HEROES_READ,
          Permission.LOOTLOG_LOOTS_TITANS_READ,
        ]),
      ]),
    ).toEqual([2, 3, 5, 6, 7]);
  });

  it("preserves administrative access while retaining organization isolation", () => {
    expect(visibleNpcIds([], true)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
});
