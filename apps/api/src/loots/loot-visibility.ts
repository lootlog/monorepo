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
} from "#src/database/drizzle/loot.schema";
import type { roleTable } from "#src/database/drizzle/organization.schema";

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

  const roleConditions = collapseReadableRoles(readableRoles).map((grant) => {
    const excludedTypes: NonNullable<
      typeof npcSnapshotTable.$inferSelect.type
    >[] = [];

    if (!grant.readTitans) excludedTypes.push("TITAN");

    if (!grant.readHeroes) excludedTypes.push("HERO", "EVENT_HERO");

    return and(
      isNotNull(visibilityNpc.lvl),
      between(visibilityNpc.lvl, grant.from, grant.to),
      isNotNull(visibilityNpc.type),
      excludedTypes.length > 0
        ? notInArray(visibilityNpc.type, excludedTypes)
        : undefined,
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

interface NormalizedRoleGrant {
  from: number;
  to: number;
  readonly readTitans: boolean;
  readonly readHeroes: boolean;
}

function collapseReadableRoles(
  roles: readonly {
    readonly lvlRangeFrom: number | null;
    readonly lvlRangeTo: number | null;
    readonly permissions: readonly string[];
  }[],
): NormalizedRoleGrant[] {
  const sorted = roles
    .map((role): NormalizedRoleGrant => ({
      from: normalizeSqlLevel(role.lvlRangeFrom ?? 0, 0),
      to: normalizeSqlLevel(role.lvlRangeTo ?? 500, 500),
      readTitans: role.permissions.includes(LOOT_PERMISSION.readTitans),
      readHeroes: role.permissions.includes(LOOT_PERMISSION.readHeroes),
    }))
    .toSorted((left, right) => left.from - right.from || right.to - left.to);

  const merged: NormalizedRoleGrant[] = [];

  for (const grant of sorted) {
    const sameTypePrevious = merged.findLast(
      (candidate) =>
        candidate.readTitans === grant.readTitans &&
        candidate.readHeroes === grant.readHeroes,
    );

    if (
      sameTypePrevious &&
      sameTypePrevious.from <= sameTypePrevious.to &&
      grant.from <= grant.to &&
      grant.from <= sameTypePrevious.to + 1
    ) {
      sameTypePrevious.to = Math.max(sameTypePrevious.to, grant.to);
      continue;
    }

    if (
      sameTypePrevious &&
      sameTypePrevious.from === grant.from &&
      sameTypePrevious.to === grant.to
    ) {
      continue;
    }

    merged.push(grant);
  }

  return merged.filter(
    (grant) =>
      !merged.some(
        (other) =>
          other !== grant &&
          other.from <= other.to &&
          other.from <= grant.from &&
          other.to >= grant.to &&
          (other.readTitans || !grant.readTitans) &&
          (other.readHeroes || !grant.readHeroes),
      ),
  );
}

function normalizeSqlLevel(value: number, fallback: number): number {
  return Number.isFinite(value) ? Math.trunc(value) : fallback;
}
