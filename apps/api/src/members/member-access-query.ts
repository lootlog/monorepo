import type { ApiDatabase } from "#src/database/drizzle/database";
import { apiKeyOrganizationFilter } from "#src/runtime/auth/organization-scope";
import { Effect } from "effect";
import { Permission } from "@lootlog/schema/permissions";
import { and, arrayOverlaps, eq, isNotNull, or } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import {
  guildTable,
  memberTable,
  memberToRoleTable,
  roleTable,
} from "#src/database/drizzle/schema";

export const activeGuildMemberJoin = (
  discordId: string,
  guildId: AnyPgColumn = guildTable.id,
) =>
  and(
    eq(memberTable.guildId, guildId),
    eq(memberTable.userId, discordId),
    eq(memberTable.active, true),
    isNotNull(memberTable.globalUserId),
  );

export const selectAccessibleGuilds = (
  database: typeof ApiDatabase.Service,
  discordId: string,
  permissions: ReadonlyArray<Permission> = [Permission.LOOTLOG_ACCESS],
) =>
  accessibleGuildsQuery(database, discordId, permissions).pipe(Effect.flatten);

/** Reuse the scoped access query in a CTE without an extra database round trip. */
export const accessibleGuildsQuery = (
  database: typeof ApiDatabase.Service,
  discordId: string,
  permissions: ReadonlyArray<Permission>,
) =>
  Effect.map(apiKeyOrganizationFilter(guildTable.id), (keyScope) =>
    database
      .selectDistinct({ guild: guildTable })
      .from(guildTable)
      .leftJoin(memberTable, activeGuildMemberJoin(discordId))
      .leftJoin(memberToRoleTable, eq(memberToRoleTable.A, memberTable.id))
      .leftJoin(roleTable, eq(memberToRoleTable.B, roleTable.id))
      .where(
        and(
          keyScope,
          eq(guildTable.active, true),
          or(
            eq(guildTable.ownerId, discordId),
            arrayOverlaps(roleTable.permissions, [...permissions]),
          ),
        ),
      ),
  );
