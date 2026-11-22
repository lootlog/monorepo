import {
  createAccessPolicy,
  Capability,
  memberCapabilities,
} from "@lootlog/domain/access-policy";
import { and, eq, or, sql } from "drizzle-orm";
import { Effect } from "effect";
import type { ApiDatabase } from "#src/database/drizzle/database";
import { organizationLootRecordTable } from "#src/database/drizzle/loot.schema";
import type {
  guildTable,
  roleTable,
} from "#src/database/drizzle/organization.schema";
import {
  selectAccessibleGuilds,
  selectActiveGuildMembers,
} from "#src/members/member-access-query";
import { hydrateMemberRoles } from "#src/members/member-role-hydration";
import { buildLootNpcVisibilityCondition } from "#src/loots/loot-visibility";

export type UserLootScope = {
  guild: typeof guildTable.$inferSelect;
  roles: ReadonlyArray<typeof roleTable.$inferSelect>;
};

export const loadUserLootScopes = Effect.fnUntraced(function* (
  database: typeof ApiDatabase.Service,
  discordId: string,
) {
  const guilds = yield* selectAccessibleGuilds(database, discordId);

  if (!guilds.length) return [];

  const members = yield* selectActiveGuildMembers(
    database,
    discordId,
    guilds.map(({ guild }) => guild.id),
  );

  const hydrated = yield* hydrateMemberRoles(database, members);

  return guilds.map(({ guild }): UserLootScope => ({
    guild,
    roles: hydrated.find((member) => member.guildId === guild.id)?.roles ?? [],
  }));
});

export const userLootScopeAccess = (
  { guild, roles }: UserLootScope,
  discordId: string,
) => {
  const permissions = memberCapabilities({
    ownerId: guild.ownerId,
    viewerId: discordId,
    roles,
  });

  const policy = createAccessPolicy({ capabilities: permissions });

  return policy.allows(Capability.LOOTLOG_LOOTS_READ)
    ? { permissions, policy }
    : undefined;
};

export const buildUserLootRecordCondition = (
  scopes: ReadonlyArray<UserLootScope>,
  discordId: string,
) =>
  or(
    ...scopes.flatMap((scope) => {
      const access = userLootScopeAccess(scope, discordId);

      return access
        ? [
            and(
              eq(organizationLootRecordTable.guildId, scope.guild.id),
              buildLootNpcVisibilityCondition(
                organizationLootRecordTable.npcVisibility,
                access.permissions,
                scope.roles,
              ),
            ),
          ]
        : [];
    }),
  ) ?? sql`false`;
