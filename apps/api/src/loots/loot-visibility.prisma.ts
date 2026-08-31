import { db as prismaDb } from "#src/prisma/db";
import type { FieldOutputTypes } from "../prisma/contract.js";
import {
  LOOT_PERMISSION,
  type LootVisibilityRole,
} from "@lootlog/loot-visibility";

const Permission = prismaDb.nativeEnums.public.Permission.members;
type Permission = (typeof Permission)[keyof typeof Permission];
type Role = FieldOutputTypes["public"]["Role"];

export function toLootVisibilityRoles(
  roles: readonly Role[],
): LootVisibilityRole[] {
  return roles.map((role) => ({
    id: role.id,
    levelFrom: role.lvlRangeFrom ?? 0,
    levelTo: role.lvlRangeTo ?? 500,
    permissions: role.permissions,
  }));
}

export function buildLootNpcVisibilitySql(
  permissions: readonly Permission[],
  roles: readonly Role[],
): string {
  if (permissions.includes(Permission.OWNER)) {
    return "";
  }

  const completeRoles = toLootVisibilityRoles(roles).filter((role) =>
    role.permissions.includes(LOOT_PERMISSION.read),
  );
  if (completeRoles.length === 0) {
    return "AND FALSE";
  }

  const roleConditions = completeRoles
    .map(buildCompleteRoleNpcSqlCondition)
    .join(" OR ");

  return `
    AND EXISTS (
      SELECT 1 FROM "LootNpc" visibility_loot_npc
      WHERE visibility_loot_npc."lootId" = l.id
    )
    AND NOT EXISTS (
      SELECT 1
      FROM "LootNpc" visibility_loot_npc
      INNER JOIN "NpcSnapshot" visibility_npc
        ON visibility_npc.id = visibility_loot_npc."npcSnapshotId"
      WHERE visibility_loot_npc."lootId" = l.id
        AND NOT (${roleConditions})
    )
  `;
}

function buildCompleteRoleNpcSqlCondition(role: LootVisibilityRole): string {
  const levelFrom = normalizeSqlLevel(role.levelFrom, 0);
  const levelTo = normalizeSqlLevel(role.levelTo, 500);
  const excludedTypes: string[] = [];

  if (!role.permissions.includes(LOOT_PERMISSION.readTitans)) {
    excludedTypes.push("'TITAN'");
  }
  if (!role.permissions.includes(LOOT_PERMISSION.readHeroes)) {
    excludedTypes.push("'HERO'", "'EVENT_HERO'");
  }

  const typeCondition =
    excludedTypes.length === 0
      ? "visibility_npc.type IS NOT NULL"
      : `visibility_npc.type IS NOT NULL AND visibility_npc.type NOT IN (${excludedTypes.join(", ")})`;

  return `(
    visibility_npc.lvl IS NOT NULL
    AND visibility_npc.lvl BETWEEN ${levelFrom} AND ${levelTo}
    AND ${typeCondition}
  )`;
}

function normalizeSqlLevel(value: number, fallback: number): number {
  return Number.isFinite(value) ? Math.trunc(value) : fallback;
}
