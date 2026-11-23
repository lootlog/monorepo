import type {
  AdminOrganization,
  AdminOrganizationsOverview,
  AdminOrganizationsPage,
  AdminOrganizationsSearch,
} from "@lootlog/schema/admin-organizations";
import {
  type SQL,
  and,
  count,
  countDistinct,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  not,
  or,
  sql,
} from "drizzle-orm";
import { Clock, Effect } from "effect";
import { organizationLootRecordTable } from "#src/database/drizzle/loot.schema";
import {
  discordGuildSyncStateTable,
  guildTable,
  memberTable,
} from "#src/database/drizzle/organization.schema";
import { containsPattern } from "#src/shared/sql-like";
import {
  activeMember,
  type Database,
  countWhere,
  isoOrNull,
  statusOf,
  statusWhere,
  suspended,
} from "./organization-operator.shared.js";

const DAY_MS = 24 * 60 * 60 * 1_000;

export const organizationListQueries = (database: Database) => {
  const organizationColumns = () => {
    const activeMembers = database
      .select({ value: count().as("value") })
      .from(memberTable)
      .where(and(eq(memberTable.guildId, guildTable.id), activeMember))
      .as("active_members");

    const lastLoot = database
      .select({ at: organizationLootRecordTable.lootCreatedAt })
      .from(organizationLootRecordTable)
      .where(eq(organizationLootRecordTable.guildId, guildTable.id))
      .orderBy(desc(organizationLootRecordTable.lootId))
      .limit(1)
      .as("last_loot");

    const owner = database
      .select({ name: memberTable.name, userId: memberTable.globalUserId })
      .from(memberTable)
      .where(
        and(
          eq(memberTable.guildId, guildTable.id),
          eq(memberTable.userId, guildTable.ownerId),
        ),
      )
      .limit(1)
      .as("owner");

    return { activeMembers, lastLoot, owner };
  };

  const selectOrganizations = (where: SQL | undefined) => {
    const { activeMembers, lastLoot, owner } = organizationColumns();

    return {
      activeMembers,
      lastLoot,
      query: database
        .select({
          guild: guildTable,
          activeMembers: activeMembers.value,
          lastLootAt: lastLoot.at,
          ownerName: owner.name,
          ownerUserId: owner.userId,
          syncStatus: discordGuildSyncStateTable.status,
          hasRequiredPermissions:
            discordGuildSyncStateTable.hasRequiredPermissions,
        })
        .from(guildTable)
        .leftJoin(
          discordGuildSyncStateTable,
          eq(discordGuildSyncStateTable.guildId, guildTable.id),
        )
        .leftJoinLateral(activeMembers, sql`true`)
        .leftJoinLateral(lastLoot, sql`true`)
        .leftJoinLateral(owner, sql`true`)
        .where(where)
        .$dynamic(),
    };
  };

  type OrganizationRow = {
    readonly guild: typeof guildTable.$inferSelect;
    readonly activeMembers: number | null;
    readonly lastLootAt: Date | null;
    readonly ownerName: string | null;
    readonly ownerUserId: string | null;
    readonly syncStatus: AdminOrganization["syncStatus"];
    readonly hasRequiredPermissions: boolean | null;
  };

  const toOrganization = (row: OrganizationRow): AdminOrganization => ({
    id: row.guild.id,
    name: row.guild.name,
    icon: row.guild.icon,
    vanityUrl: row.guild.vanityUrl,
    owner: {
      discordId: row.guild.ownerId,
      name: row.ownerName,
      userId: row.ownerUserId,
    },
    status: statusOf(row.guild),
    activeMembers: row.activeMembers ?? 0,
    lastLootAt: isoOrNull(row.lastLootAt),
    syncStatus: row.syncStatus,
    hasRequiredPermissions: row.hasRequiredPermissions ?? false,
    createdAt: row.guild.createdAt.toISOString(),
  });

  const searchWhere = (search: AdminOrganizationsSearch) => {
    const text = search.search?.trim();

    return and(
      text
        ? or(
            ilike(guildTable.name, containsPattern(text)),
            ilike(guildTable.vanityUrl, containsPattern(text)),
            eq(guildTable.id, text),
            eq(guildTable.ownerId, text),
          )
        : undefined,
      search.status ? statusWhere[search.status] : undefined,
      search.syncStatus
        ? eq(discordGuildSyncStateTable.status, search.syncStatus)
        : undefined,
      search.missingPermissions === undefined
        ? undefined
        : search.missingPermissions
          ? not(
              sql`coalesce(${discordGuildSyncStateTable.hasRequiredPermissions}, false)`,
            )
          : eq(discordGuildSyncStateTable.hasRequiredPermissions, true),
    );
  };

  const searchOrganizations = Effect.fn("organizationOperator.search")(
    function* (search: AdminOrganizationsSearch) {
      const where = searchWhere(search);
      const { activeMembers, lastLoot, query } = selectOrganizations(where);

      const order =
        search.sort === "members"
          ? [desc(activeMembers.value), desc(guildTable.createdAt)]
          : search.sort === "activity"
            ? [sql`${lastLoot.at} desc nulls last`, desc(guildTable.createdAt)]
            : [desc(guildTable.createdAt)];

      const [rows, totals] = yield* Effect.all(
        [
          query
            .orderBy(...order, guildTable.id)
            .limit(search.limit)
            .offset(search.offset),
          database
            .select({ total: count() })
            .from(guildTable)
            .leftJoin(
              discordGuildSyncStateTable,
              eq(discordGuildSyncStateTable.guildId, guildTable.id),
            )
            .where(where),
        ],
        { concurrency: 2 },
      );

      return {
        organizations: rows.map(toOrganization),
        total: totals[0]?.total ?? 0,
      } satisfies AdminOrganizationsPage;
    },
  );

  const getOverview = Effect.fn("organizationOperator.overview")(function* () {
    const weekAgo = new Date((yield* Clock.currentTimeMillis) - 7 * DAY_MS);

    const [totals, recent] = yield* Effect.all(
      [
        database
          .select({
            total: count(),
            active: countWhere(statusWhere.active),
            suspended: countWhere(suspended),
            syncFailing: countWhere(
              inArray(discordGuildSyncStateTable.status, [
                "FAILED",
                "NOT_FOUND",
              ]),
            ),
          })
          .from(guildTable)
          .leftJoin(
            discordGuildSyncStateTable,
            eq(discordGuildSyncStateTable.guildId, guildTable.id),
          ),
        database
          .select({
            organizations: countDistinct(organizationLootRecordTable.guildId),
          })
          .from(organizationLootRecordTable)
          .where(gte(organizationLootRecordTable.createdAt, weekAgo)),
      ],
      { concurrency: 2 },
    );

    const row = totals[0];

    return {
      total: row?.total ?? 0,
      active: row?.active ?? 0,
      suspended: row?.suspended ?? 0,
      syncFailing: row?.syncFailing ?? 0,
      activeLastWeek: recent[0]?.organizations ?? 0,
    } satisfies AdminOrganizationsOverview;
  });

  return {
    selectOrganizations,
    toOrganization,
    searchOrganizations,
    getOverview,
  };
};
