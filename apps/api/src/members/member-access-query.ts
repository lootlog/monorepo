import type { ApiDatabase } from "#src/database/drizzle/database";
import { apiKeyOrganizationFilter } from "#src/runtime/auth/organization-scope";
import { Effect } from "effect";
import { Permission } from "@lootlog/schema/permissions";
import { and, arrayOverlaps, eq, isNotNull, or } from "drizzle-orm";
import {
  guildTable,
  memberTable,
  memberToRoleTable,
  roleTable,
} from "#src/database/drizzle/schema";

export const activeGuildMemberJoin = (discordId: string) =>
  and(
    eq(memberTable.guildId, guildTable.id),
    eq(memberTable.userId, discordId),
    eq(memberTable.active, true),
    isNotNull(memberTable.globalUserId),
  );

export const selectAccessibleGuilds = (
  database: typeof ApiDatabase.Service,
  discordId: string,
  permissions: ReadonlyArray<Permission> = [Permission.LOOTLOG_ACCESS],
) =>
  Effect.gen(function* () {
    const keyScope = yield* apiKeyOrganizationFilter(guildTable.id);

    return yield* database
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
      );
  });
