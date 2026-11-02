import {
  createAccessPolicy,
  Capability,
  memberCapabilities,
} from "@lootlog/domain/access-policy";
import { and, eq, or, sql, type SQLWrapper } from "drizzle-orm";
import { Effect } from "effect";
import type { ApiDatabase } from "#src/database/drizzle/database";
import {
  organizationLootRecordTable,
  type guildTable,
  type roleTable,
} from "#src/database/drizzle/schema";
import {
  selectAccessibleGuilds,
  selectActiveGuildMembers,
} from "#src/members/member-access-query";
import { hydrateMemberRoles } from "#src/members/member-role-hydration";
import { buildLootNpcVisibilityCondition } from "#src/loots/loot-visibility";

/** One Organization the user belongs to, with the roles that set what they see. */
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

/** The scope's loot access policy, or none when the user may not read its loots. */
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

/** Matches an Organization record of `lootId` the user can see in one of their scopes. */
export const buildUserLootRecordCondition = (
  scopes: ReadonlyArray<UserLootScope>,
  discordId: string,
  lootId: SQLWrapper,
) =>
  or(
    ...scopes.flatMap((scope) => {
      const access = userLootScopeAccess(scope, discordId);

      return access
        ? [
            and(
              eq(organizationLootRecordTable.guildId, scope.guild.id),
              buildLootNpcVisibilityCondition(
                lootId,
                access.permissions,
                scope.roles,
              ),
            ),
          ]
        : [];
    }),
  ) ?? sql`false`;
