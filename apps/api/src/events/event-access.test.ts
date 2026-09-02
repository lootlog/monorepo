import { describe, expect, it } from "bun:test";
import { createAccessPolicy } from "@lootlog/domain/access-policy";
import { Permission } from "@lootlog/schema/permissions";
import type { ApiDatabase } from "#src/database/drizzle/database";
import type { roleTable } from "#src/database/drizzle/schema";
import { makeEventAccess } from "./event-access.js";

type Role = typeof roleTable.$inferSelect;

const role = (from: number, to: number): Role => ({
  id: "role-1",
  name: "Role",
  color: 0,
  position: 0,
  permissions: [Permission.LOOTLOG_EVENTS_READ],
  lvlRangeFrom: from,
  lvlRangeTo: to,
  guildId: "guild-1",
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe("event access Effect module", () => {
  it("keeps hero visibility fail-closed to one matching role range", () => {
    const access = makeEventAccess({} as typeof ApiDatabase.Service);
    const policy = createAccessPolicy({
      capabilities: [Permission.LOOTLOG_EVENTS_READ],
    });

    expect(access.isHeroVisible({ npcLvl: 100 }, [role(90, 110)], policy)).toBe(
      true,
    );
    expect(access.isHeroVisible({ npcLvl: 120 }, [role(90, 110)], policy)).toBe(
      false,
    );
  });
});
