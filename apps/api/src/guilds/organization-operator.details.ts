import type {
  AdminOrganizationDetails,
  AdminOrganizationMembersPage,
  AdminOrganizationMembersSearch,
  AdminUserOrganization,
} from "@lootlog/schema/admin-organizations";
import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  not,
  or,
  sql,
} from "drizzle-orm";
import { Clock, Effect } from "effect";
import { guildDocumentTable } from "#src/database/drizzle/guild-document.schema";
import {
  lootTable,
  organizationLootRecordTable,
} from "#src/database/drizzle/loot.schema";
import {
  notificationJobTable,
  notificationRuleTable,
} from "#src/database/drizzle/notification.schema";
import {
  discordGuildSyncStateTable,
  guildTable,
  memberTable,
  memberToRoleTable,
  organizationOperatorAuditTable,
  roleTable,
} from "#src/database/drizzle/organization.schema";
import { containsPattern } from "#src/shared/sql-like";
import {
  activeMember,
  auditEntry,
  type Database,
  isoOrNull,
  OrganizationNotFound,
  requireOrganization,
  statusOf,
} from "./organization-operator.shared.js";
import type { organizationListQueries } from "./organization-operator.list.js";

const DAY_MS = 24 * 60 * 60 * 1_000;

const RECENT_AUDIT_ENTRIES = 20;

export const organizationDetailQueries = (
  database: Database,
  {
    selectOrganizations,
    toOrganization,
  }: ReturnType<typeof organizationListQueries>,
) => {
  const auditPage = (guildId: string | undefined, limit: number, offset = 0) =>
    database
      .select({
        id: organizationOperatorAuditTable.id,
        guildId: organizationOperatorAuditTable.guildId,
        guildName: guildTable.name,
        operatorName: organizationOperatorAuditTable.operatorName,
        action: organizationOperatorAuditTable.action,
        details: organizationOperatorAuditTable.details,
        createdAt: organizationOperatorAuditTable.createdAt,
      })
      .from(organizationOperatorAuditTable)
      .innerJoin(
        guildTable,
        eq(guildTable.id, organizationOperatorAuditTable.guildId),
      )
      .where(
        guildId === undefined
          ? undefined
          : eq(organizationOperatorAuditTable.guildId, guildId),
      )
      .orderBy(
        desc(organizationOperatorAuditTable.createdAt),
        desc(organizationOperatorAuditTable.id),
      )
      .limit(limit)
      .offset(offset)
      .pipe(Effect.map((rows) => rows.map(auditEntry)));

  const listAudit = Effect.fn("organizationOperator.audit")(function* (
    limit: number,
    offset: number,
  ) {
    const [entries, totals] = yield* Effect.all(
      [
        auditPage(undefined, limit, offset),
        database
          .select({ total: count() })
          .from(organizationOperatorAuditTable),
      ],
      { concurrency: 2 },
    );

    return { entries, total: totals[0]?.total ?? 0 };
  });

  const getOrganization = Effect.fn("organizationOperator.get")(function* (
    guildId: string,
  ) {
    const rows = yield* selectOrganizations(eq(guildTable.id, guildId)).query;
    const row = rows[0];

    if (!row) return yield* new OrganizationNotFound();

    const monthAgo = new Date((yield* Clock.currentTimeMillis) - 30 * DAY_MS);

    const firstLootOfMonth = database
      .select({ id: lootTable.id })
      .from(lootTable)
      .where(gte(lootTable.createdAt, monthAgo))
      .orderBy(lootTable.createdAt)
      .limit(1);

    const roleMembers = database
      .select({ value: count().as("value") })
      .from(memberToRoleTable)
      .innerJoin(memberTable, eq(memberTable.id, memberToRoleTable.A))
      .where(and(eq(memberToRoleTable.B, roleTable.id), activeMember))
      .as("role_members");

    const [
      inactiveMembers,
      documents,
      rules,
      loots,
      discord,
      notifications,
      lastNotificationError,
      roles,
      audit,
    ] = yield* Effect.all(
      [
        database
          .select({ value: count() })
          .from(memberTable)
          .where(
            and(
              eq(memberTable.guildId, guildId),
              not(activeMember ?? sql`true`),
            ),
          ),
        database
          .select({ value: count() })
          .from(guildDocumentTable)
          .where(
            and(
              eq(guildDocumentTable.guildId, guildId),
              isNull(guildDocumentTable.deletedAt),
            ),
          ),
        database
          .select({ value: count() })
          .from(notificationRuleTable)
          .where(
            and(
              eq(notificationRuleTable.ownerType, "GUILD"),
              eq(notificationRuleTable.ownerId, guildId),
            ),
          ),
        database
          .select({ value: count() })
          .from(organizationLootRecordTable)
          .where(
            and(
              eq(organizationLootRecordTable.guildId, guildId),
              gte(organizationLootRecordTable.lootId, firstLootOfMonth),
            ),
          ),
        database
          .select()
          .from(discordGuildSyncStateTable)
          .where(eq(discordGuildSyncStateTable.guildId, guildId))
          .limit(1),
        database
          .select({
            status: notificationJobTable.status,
            value: count(),
          })
          .from(notificationJobTable)
          .where(
            and(
              eq(notificationJobTable.ownerType, "GUILD"),
              eq(notificationJobTable.ownerId, guildId),
              inArray(notificationJobTable.status, [
                "PENDING",
                "FAILED",
                "BLOCKED",
              ]),
            ),
          )
          .groupBy(notificationJobTable.status),
        database
          .select({ error: notificationJobTable.lastError })
          .from(notificationJobTable)
          .where(
            and(
              eq(notificationJobTable.ownerType, "GUILD"),
              eq(notificationJobTable.ownerId, guildId),
              eq(notificationJobTable.status, "FAILED"),
            ),
          )
          .orderBy(desc(notificationJobTable.scheduledFor))
          .limit(1),
        database
          .select({
            role: roleTable,
            members: roleMembers.value,
          })
          .from(roleTable)
          .leftJoinLateral(roleMembers, sql`true`)
          .where(eq(roleTable.guildId, guildId))
          .orderBy(desc(roleTable.position), roleTable.name),
        auditPage(guildId, RECENT_AUDIT_ENTRIES),
      ],
      { concurrency: 4 },
    );

    const jobs = new Map(
      notifications.map(({ status, value }) => [status, value]),
    );

    const state = discord[0];
    const { guild } = row;

    return {
      organization: toOrganization(row),
      banner: guild.banner,
      suspension:
        guild.suspendedAt === null
          ? null
          : {
              at: guild.suspendedAt.toISOString(),
              reason: guild.suspendedReason ?? "",
              by: guild.suspendedBy,
            },
      limits: {
        notificationRuleLimit: guild.notificationRuleLimit,
        documentLimit: guild.documentLimit,
      },
      publicStatsCardEnabled: guild.publicStatsCardEnabled,
      usage: {
        inactiveMembers: inactiveMembers[0]?.value ?? 0,
        documents: documents[0]?.value ?? 0,
        notificationRules: rules[0]?.value ?? 0,
        lootsLastMonth: loots[0]?.value ?? 0,
      },
      discord: state
        ? {
            status: state.status,
            hasRequiredPermissions: state.hasRequiredPermissions,
            missingPermissions: state.missingPermissions,
            channelCount: state.channelCount,
            selectableChannelCount: state.selectableChannelCount,
            lastAttemptAt: isoOrNull(state.lastAttemptAt),
            lastSuccessAt: isoOrNull(state.lastSuccessAt),
            lastError: state.lastError,
          }
        : null,
      notifications: {
        pending: jobs.get("PENDING") ?? 0,
        failed: jobs.get("FAILED") ?? 0,
        blocked: jobs.get("BLOCKED") ?? 0,
        lastError: lastNotificationError[0]?.error ?? null,
      },
      roles: roles.map(({ role, members }) => ({
        id: role.id,
        name: role.name,
        color: role.color,
        position: role.position,
        permissions: role.permissions,
        levelFrom: role.lvlRangeFrom,
        levelTo: role.lvlRangeTo,
        members: members ?? 0,
      })),
      audit,
    } satisfies AdminOrganizationDetails;
  });

  const listMembers = Effect.fn("organizationOperator.members")(function* (
    query: AdminOrganizationMembersSearch,
  ) {
    yield* requireOrganization(database, query.guildId);

    const text = query.search?.trim();

    const where = and(
      eq(memberTable.guildId, query.guildId),
      text
        ? or(
            ilike(memberTable.name, containsPattern(text)),
            ilike(memberTable.username, containsPattern(text)),
            ilike(memberTable.discordDisplayName, containsPattern(text)),
            eq(memberTable.userId, text),
            eq(memberTable.globalUserId, text),
          )
        : undefined,
    );

    const [rows, totals] = yield* Effect.all(
      [
        database
          .select()
          .from(memberTable)
          .where(where)
          .orderBy(desc(memberTable.active), memberTable.name, memberTable.id)
          .limit(query.limit)
          .offset(query.offset),
        database.select({ total: count() }).from(memberTable).where(where),
      ],
      { concurrency: 2 },
    );

    return {
      members: rows.map((member) => ({
        id: member.id,
        name: member.name,
        username: member.username ?? member.discordDisplayName,
        discordId: member.userId,
        userId: member.globalUserId,
        type: member.type,
        active: member.active && member.globalUserId !== null,
        joinedAt: isoOrNull(member.joinedAt),
        lastDiscordSyncAt: isoOrNull(member.lastDiscordSyncAt),
      })),
      total: totals[0]?.total ?? 0,
    } satisfies AdminOrganizationMembersPage;
  });

  const listUserOrganizations = Effect.fn("organizationOperator.userOrgs")(
    function* (discordId: string) {
      const rows = yield* database
        .select({
          guild: guildTable,
          memberType: memberTable.type,
          memberActive: memberTable.active,
          globalUserId: memberTable.globalUserId,
        })
        .from(memberTable)
        .innerJoin(guildTable, eq(guildTable.id, memberTable.guildId))
        .where(eq(memberTable.userId, discordId))
        .orderBy(desc(memberTable.active), guildTable.name);

      return rows.map((row): AdminUserOrganization => ({
        id: row.guild.id,
        name: row.guild.name,
        icon: row.guild.icon,
        status: statusOf(row.guild),
        memberType: row.memberType,
        memberActive: row.memberActive && row.globalUserId !== null,
      }));
    },
  );

  return { getOrganization, listMembers, listUserOrganizations, listAudit };
};
