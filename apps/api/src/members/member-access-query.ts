import type { ApiDatabase } from "#src/database/drizzle/database";
import { apiKeyOrganizationFilter } from "#src/runtime/auth/organization-scope";
import { Effect } from "effect";
import {
  AccessRequirement,
  capabilitiesGrantingAny,
  createAccessPolicy,
  memberCapabilities,
} from "@lootlog/domain/access-policy";
import { Permission } from "@lootlog/schema/permissions";
import {
  type SQL,
  and,
  arrayOverlaps,
  eq,
  inArray,
  isNotNull,
  or,
  sql,
} from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import {
  guildTable,
  memberTable,
  memberToRoleTable,
  roleTable,
} from "#src/database/drizzle/schema";

/**
 * A Member grants role access only while it is active and linked to a User.
 * The Organization context and the cross-Organization queries below share
 * this rule.
 */
export const isActiveMember = (
  member: Pick<typeof memberTable.$inferSelect, "active" | "globalUserId">,
) => member.active && member.globalUserId !== null;

const activeMemberWhere = (user: SQL) =>
  and(user, eq(memberTable.active, true), isNotNull(memberTable.globalUserId));

const activeMember = (discordId: string) =>
  activeMemberWhere(eq(memberTable.userId, discordId));

export const activeMembersWhere = (discordIds: ReadonlyArray<string>) =>
  activeMemberWhere(inArray(memberTable.userId, [...discordIds]));

export const activeGuildMemberJoin = (
  discordId: string,
  guildId: AnyPgColumn | string = guildTable.id,
) => and(eq(memberTable.guildId, guildId), activeMember(discordId));

type MemberQueryDatabase = Pick<typeof ApiDatabase.Service, "select">;

/** The caller's active Member rows in `guildIds`, for writes that record the acting Member. */
export const selectActiveGuildMembers = (
  database: MemberQueryDatabase,
  discordId: string,
  guildIds: ReadonlyArray<string>,
) =>
  guildIds.length === 0
    ? Effect.succeed([])
    : database
        .select()
        .from(memberTable)
        .where(
          and(
            inArray(memberTable.guildId, [...guildIds]),
            activeMember(discordId),
          ),
        );

/** The caller's active Member row in one Organization, if any. */
export const findActiveGuildMember = (
  database: MemberQueryDatabase,
  discordId: string,
  guildId: string,
) =>
  database
    .select()
    .from(memberTable)
    .where(activeGuildMemberJoin(discordId, guildId))
    .limit(1)
    .pipe(Effect.map((rows) => rows[0]));

/**
 * Cross-Organization reads for `/me`, the game client, and write fan-out.
 * They are eventually consistent: they trust `Guild.ownerId` from the bot's
 * guild events and the stored active Members and roles, and never wait for
 * Discord. An Organization endpoint instead refreshes the caller's Member from
 * Discord past the soft TTL, and also requires that row for the owner, which
 * the refresh creates on first use.
 */
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
          arrayOverlaps(
            roleTable.permissions,
            capabilitiesGrantingAny(permissions),
          ),
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

/**
 * Resolve which of `guilds` still grant one of `permissions` to each of
 * `discordIds`, using the same owner and active-member role rules as
 * {@link accessibleGuildsQuery}. Callers pass guilds they already resolved for
 * the requester, so the requester's key scope stays applied.
 */
export const selectGuildIdsGrantingPermissions = (
  database: typeof ApiDatabase.Service,
  discordIds: ReadonlyArray<string>,
  guilds: ReadonlyArray<{ id: string; ownerId: string }>,
  permissions: ReadonlyArray<Permission>,
) =>
  Effect.gen(function* () {
    const granted = new Map<string, Set<string>>();

    const grant = (discordId: string, guildId: string) => {
      const guildIds = granted.get(discordId) ?? new Set<string>();
      guildIds.add(guildId);

      granted.set(discordId, guildIds);
    };

    const requested = new Set(discordIds);

    for (const guild of guilds) {
      if (requested.has(guild.ownerId)) grant(guild.ownerId, guild.id);
    }

    if (requested.size === 0 || guilds.length === 0) return granted;

    const rows = yield* database
      .selectDistinct({
        discordId: memberTable.userId,
        guildId: memberTable.guildId,
      })
      .from(memberTable)
      .innerJoin(memberToRoleTable, eq(memberToRoleTable.A, memberTable.id))
      .innerJoin(roleTable, eq(roleTable.id, memberToRoleTable.B))
      .where(
        and(
          activeMembersWhere([...requested]),
          inArray(
            memberTable.guildId,
            guilds.map(({ id }) => id),
          ),
          arrayOverlaps(
            roleTable.permissions,
            capabilitiesGrantingAny(permissions),
          ),
        ),
      );

    for (const row of rows) grant(row.discordId, row.guildId);

    return granted;
  });

type GuildRole = Pick<
  typeof roleTable.$inferSelect,
  "permissions" | "lvlRangeFrom" | "lvlRangeTo"
>;

/**
 * The caller's roles in every Organization granting one of `permissions`, and
 * whether the caller administers it, for cross-Organization reads that filter
 * each record by its own visibility rule.
 */
export const selectAccessibleGuildRoles = Effect.fnUntraced(function* (
  database: typeof ApiDatabase.Service,
  discordId: string,
  permissions: ReadonlyArray<Permission>,
) {
  const accessible = database
    .$with("accessible_guilds")
    .as(yield* accessibleGuildsQuery(database, discordId, permissions));

  const accessRows = yield* database
    .with(accessible)
    .select({
      guildId: accessible.guild.id,
      ownerId: accessible.guild.ownerId,
      role: {
        permissions: roleTable.permissions,
        lvlRangeFrom: roleTable.lvlRangeFrom,
        lvlRangeTo: roleTable.lvlRangeTo,
      },
    })
    .from(accessible)
    .leftJoin(
      memberTable,
      activeGuildMemberJoin(discordId, accessible.guild.id),
    )
    .leftJoin(memberToRoleTable, eq(memberToRoleTable.A, memberTable.id))
    .leftJoin(roleTable, eq(memberToRoleTable.B, roleTable.id));

  const rolesByGuild = new Map<string, GuildRole[]>();
  const ownerByGuild = new Map<string, string>();

  for (const { guildId, ownerId, role } of accessRows) {
    const roles = rolesByGuild.get(guildId) ?? [];

    if (role) roles.push(role);
    rolesByGuild.set(guildId, roles);
    ownerByGuild.set(guildId, ownerId);
  }

  return new Map(
    Array.from(rolesByGuild, ([guildId, roles]) => [
      guildId,
      {
        roles,
        administers: createAccessPolicy({
          capabilities: memberCapabilities({
            ownerId: ownerByGuild.get(guildId) ?? "",
            viewerId: discordId,
            roles,
          }),
        }).allowsAny(AccessRequirement.ADMINISTER),
      },
    ]),
  );
});
