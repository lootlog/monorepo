import type { ApiDatabase } from "#src/database/drizzle/database";
import { apiKeyOrganizationFilter } from "#src/runtime/auth/organization-scope";
import { Effect } from "effect";
import { Permission } from "@lootlog/schema/permissions";
import { and, arrayOverlaps, eq, isNotNull, or, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import {
  guildTable,
  memberTable,
  memberToRoleTable,
  roleTable,
} from "#src/database/drizzle/schema";

const activeMember = (discordId: string) =>
  and(
    eq(memberTable.userId, discordId),
    eq(memberTable.active, true),
    isNotNull(memberTable.globalUserId),
  );

export const activeGuildMemberJoin = (
  discordId: string,
  guildId: AnyPgColumn = guildTable.id,
) => and(eq(memberTable.guildId, guildId), activeMember(discordId));

export const selectAccessibleGuilds = (
  database: typeof ApiDatabase.Service,
  discordId: string,
  permissions: ReadonlyArray<Permission> = [Permission.LOOTLOG_ACCESS],
) =>
  accessibleGuildsQuery(database, discordId, permissions).pipe(Effect.flatten);

/**
 * Reuse the scoped access query in a CTE without an extra database round trip.
 *
 * Role grants resolve to an array of Organization ids first, so both grants
 * reach `Guild` through its indexes (`Guild_ownerId_idx` and the primary key).
 * An OR across `Guild` and a left-joined role, or an `IN` semi-join, lets the
 * planner hash-join a sequential scan of every Organization instead.
 */
export const accessibleGuildsQuery = (
  database: typeof ApiDatabase.Service,
  discordId: string,
  permissions: ReadonlyArray<Permission>,
) =>
  Effect.map(apiKeyOrganizationFilter(guildTable.id), (keyScope) => {
    const roleGrantedGuildIds = database
      .select({ guildId: memberTable.guildId })
      .from(memberTable)
      .innerJoin(memberToRoleTable, eq(memberToRoleTable.A, memberTable.id))
      .innerJoin(roleTable, eq(roleTable.id, memberToRoleTable.B))
      .where(
        and(
          activeMember(discordId),
          arrayOverlaps(roleTable.permissions, [...permissions]),
        ),
      );

    return database
      .select({ guild: guildTable })
      .from(guildTable)
      .where(
        and(
          keyScope,
          eq(guildTable.active, true),
          or(
            eq(guildTable.ownerId, discordId),
            // The query builder has no `= ANY(ARRAY(subquery))`; `inArray`
            // renders the `IN` semi-join that plans the sequential scan.
            sql`${guildTable.id} = any(array(${roleGrantedGuildIds}))`,
          ),
        ),
      );
  });
