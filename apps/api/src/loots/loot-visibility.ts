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

/**
 * `OrganizationLootRecord.npcVisibility` holds one integer per NPC of the
 * loot: the NPC's level, shifted by the span of its visibility class. A member
 * sees the loot when every one of those integers falls in a range their roles
 * grant, which is one containment test on the record instead of a subquery per
 * NPC. The encoding is persisted on every record, so it never changes.
 */
const NPC_LEVEL_SPAN = 1_000_000;

const HERO_OFFSET = NPC_LEVEL_SPAN;

const TITAN_OFFSET = 2 * NPC_LEVEL_SPAN;

/** No grant contains it: an NPC without a level or type, or a loot without NPCs. */
const HIDDEN_NPC_KEY = -1;

const encodedLootNpc = alias(lootNpcTable, "encoded_loot_npc");

const encodedNpc = alias(npcSnapshotTable, "encoded_npc");

const npcKey = sql`case when ${encodedNpc.lvl} is null or ${encodedNpc.type} is null or ${encodedNpc.lvl} not between 0 and ${sql.raw(String(NPC_LEVEL_SPAN - 1))} then ${sql.raw(String(HIDDEN_NPC_KEY))} else ${encodedNpc.lvl} + case when ${encodedNpc.type} = 'TITAN' then ${sql.raw(String(TITAN_OFFSET))} when ${encodedNpc.type} in ('HERO', 'EVENT_HERO') then ${sql.raw(String(HERO_OFFSET))} else 0 end end`;

/**
 * The visibility keys of a loot's NPCs, read from the NPCs themselves. Every
 * writer of `npcVisibility` uses this expression, so a record cannot disagree
 * with the NPCs its loot was accepted with.
 */
export const lootNpcVisibilityOf = (lootId: number | SQLWrapper) =>
  sql<string>`(${query
    .select({
      keys: sql`coalesce(range_agg(int4range(${npcKey}, ${npcKey}, '[]')), '{[${sql.raw(String(HIDDEN_NPC_KEY))},${sql.raw(String(HIDDEN_NPC_KEY))}]}'::int4multirange)`,
    })
    .from(encodedLootNpc)
    .innerJoin(encodedNpc, eq(encodedNpc.id, encodedLootNpc.npcSnapshotId))
    .where(eq(encodedLootNpc.lootId, lootId))})`;

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
