import {
  LOOT_PERMISSION,
  type LootVisibilityRole,
} from "@lootlog/domain/loot-visibility";
import { Permission } from "@lootlog/schema/permissions";
import {
  and,
  between,
  eq,
  exists,
  isNotNull,
  not,
  notExists,
  notInArray,
  or,
  sql,
  type SQLWrapper,
} from "drizzle-orm";
import { alias, QueryBuilder } from "drizzle-orm/pg-core";
import {
  lootNpcTable,
  npcSnapshotTable,
  type roleTable,
} from "#src/database/drizzle/schema";

type Role = typeof roleTable.$inferSelect;

export function toLootVisibilityRoles(
  roles: readonly Pick<
    Role,
    "id" | "lvlRangeFrom" | "lvlRangeTo" | "permissions"
  >[],
): LootVisibilityRole[] {
  return roles.map((role) => ({
    id: role.id,
    levelFrom: role.lvlRangeFrom ?? 0,
    levelTo: role.lvlRangeTo ?? 500,
    permissions: role.permissions,
  }));
}

const query = new QueryBuilder();

const visibilityLootNpc = alias(lootNpcTable, "visibility_loot_npc");

const visibilityNpc = alias(npcSnapshotTable, "visibility_npc");

export function buildLootNpcVisibilityCondition(
  lootId: SQLWrapper,
  permissions: readonly string[],
  roles: readonly {
    readonly lvlRangeFrom: number | null;
    readonly lvlRangeTo: number | null;
    readonly permissions: readonly string[];
  }[],
) {
  if (permissions.includes(Permission.OWNER)) return undefined;

  const readableRoles = roles.filter((role) =>
    role.permissions.includes(LOOT_PERMISSION.read),
  );

  if (readableRoles.length === 0) return sql`false`;

  const roleConditions = readableRoles.map((role) => {
    const excludedTypes: NonNullable<
      typeof npcSnapshotTable.$inferSelect.type
    >[] = [];

    if (!role.permissions.includes(LOOT_PERMISSION.readTitans))
      excludedTypes.push("TITAN");

    if (!role.permissions.includes(LOOT_PERMISSION.readHeroes))
      excludedTypes.push("HERO", "EVENT_HERO");

    return and(
      isNotNull(visibilityNpc.lvl),
      between(
        visibilityNpc.lvl,
        normalizeSqlLevel(role.lvlRangeFrom ?? 0, 0),
        normalizeSqlLevel(role.lvlRangeTo ?? 500, 500),
      ),
      isNotNull(visibilityNpc.type),
      notInArray(visibilityNpc.type, excludedTypes),
    );
  });

  return and(
    exists(
      query
        .select({ id: visibilityLootNpc.id })
        .from(visibilityLootNpc)
        .where(eq(visibilityLootNpc.lootId, lootId)),
    ),
    notExists(
      query
        .select({ id: visibilityLootNpc.id })
        .from(visibilityLootNpc)
        .innerJoin(
          visibilityNpc,
          eq(visibilityNpc.id, visibilityLootNpc.npcSnapshotId),
        )
        .where(
          and(
            eq(visibilityLootNpc.lootId, lootId),
            not(or(...roleConditions) ?? sql`false`),
          ),
        ),
    ),
  );
}

function normalizeSqlLevel(value: number, fallback: number): number {
  return Number.isFinite(value) ? Math.trunc(value) : fallback;
}
