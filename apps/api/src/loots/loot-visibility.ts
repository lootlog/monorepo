import {
  LOOT_PERMISSION,
  type LootVisibilityRole,
} from "@lootlog/domain/loot-visibility";
import { Permission } from "@lootlog/schema/permissions";
import { eq, sql, type SQLWrapper } from "drizzle-orm";
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

/**
 * Matches the records whose NPCs are all covered by a readable role: the
 * level of each within the role's range, a titan only with the titan grant
 * and a hero only with the hero grant. `npcVisibility` is the record's
 * column, so the query must have the Organization's record in scope.
 */
export function buildLootNpcVisibilityCondition(
  npcVisibility: SQLWrapper,
  permissions: readonly string[],
  roles: readonly {
    readonly lvlRangeFrom: number | null;
    readonly lvlRangeTo: number | null;
    readonly permissions: readonly string[];
  }[],
) {
  if (permissions.includes(Permission.OWNER)) return undefined;

  const granted = roles.flatMap((role) => {
    if (!role.permissions.includes(LOOT_PERMISSION.read)) return [];

    const from = Math.max(normalizeSqlLevel(role.lvlRangeFrom ?? 0, 0), 0);

    const to = Math.min(
      normalizeSqlLevel(role.lvlRangeTo ?? 500, 500),
      NPC_LEVEL_SPAN - 1,
    );

    if (from > to) return [];

    const offsets = [0];

    if (role.permissions.includes(LOOT_PERMISSION.readHeroes))
      offsets.push(HERO_OFFSET);

    if (role.permissions.includes(LOOT_PERMISSION.readTitans))
      offsets.push(TITAN_OFFSET);

    return offsets.map((offset) => `[${offset + from},${offset + to}]`);
  });

  if (granted.length === 0) return sql`false`;

  return sql`${npcVisibility} <@ ${`{${[...new Set(granted)].join(",")}}`}::int4multirange`;
}

function normalizeSqlLevel(value: number, fallback: number): number {
  return Number.isFinite(value) ? Math.trunc(value) : fallback;
}
