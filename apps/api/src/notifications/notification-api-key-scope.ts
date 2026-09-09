import { RESERVATION_REMINDER_RULE_NAME } from "./rules/reservation-reminder.js";
import { and, eq, inArray, or, sql, type SQL } from "drizzle-orm";
import { Effect } from "effect";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import {
  notificationJobTable,
  notificationRuleTable,
} from "#src/database/drizzle/schema";
import { selectAccessibleGuilds } from "#src/members/member-access-query";
import {
  requestApiKeyAccess,
  requestScopedIdentity,
} from "#src/runtime/auth/forward-auth-identity";
import { PermissionDeniedError } from "#src/shared/http/http-errors";
import { buildLootNpcVisibilitySql } from "#src/loots/loot-visibility";
import { Permission } from "@lootlog/schema/permissions";
import {
  selectNotificationMemberships,
  parseNotificationFilters,
} from "./rules/notification-matching.service.js";

type RuleScope = Pick<
  typeof notificationRuleTable.$inferSelect,
  "id" | "guildId" | "triggerType" | "filters" | "name"
>;

export const notificationApiKeyOrganizations = (database: ApiDatabaseValue) =>
  Effect.gen(function* () {
    if (!(yield* requestApiKeyAccess)) return undefined;
    const identity = yield* requestScopedIdentity;
    const guilds = yield* selectAccessibleGuilds(database, identity.discordId);
    return guilds.map(({ guild }) => guild);
  });

function notificationRuleInApiKeyScope(
  rule: RuleScope,
  organizationIds: readonly string[] | undefined,
): boolean {
  if (organizationIds === undefined) return true;
  // This shared system rule controls reservations across Organizations.
  if (rule.name === RESERVATION_REMINDER_RULE_NAME) return false;
  if (rule.guildId !== null) return organizationIds.includes(rule.guildId);
  if (rule.triggerType === "SCHEDULED_MESSAGE") return true;
  const guildIds = parseNotificationFilters(rule.filters).guildIds;
  return Boolean(
    guildIds?.length && guildIds.every((id) => organizationIds.includes(id)),
  );
}

/** Reservation jobs retain their source even when a session renames the shared rule. */
export const notificationRulesInApiKeyScope = Effect.fnUntraced(function* <
  Rule extends RuleScope,
>(
  database: ApiDatabaseValue,
  rules: readonly Rule[],
  organizationIds: readonly string[] | undefined,
) {
  if (organizationIds === undefined || rules.length === 0) return [...rules];
  const reservationRules = yield* database
    .selectDistinct({ ruleId: notificationJobTable.ruleId })
    .from(notificationJobTable)
    .where(
      and(
        inArray(
          notificationJobTable.ruleId,
          rules.map(({ id }) => id),
        ),
        eq(notificationJobTable.sourceEntityType, "reservation"),
      ),
    );
  const reservationRuleIds = new Set(
    reservationRules.map(({ ruleId }) => ruleId),
  );
  return rules.filter(
    (rule) =>
      !reservationRuleIds.has(rule.id) &&
      notificationRuleInApiKeyScope(rule, organizationIds),
  );
});

export const requireNotificationRuleApiKeyScope = (
  database: ApiDatabaseValue,
  rule: RuleScope,
) =>
  Effect.gen(function* () {
    const guilds = yield* notificationApiKeyOrganizations(database);
    const allowed = yield* notificationRulesInApiKeyScope(
      database,
      [rule],
      guilds?.map((guild) => guild.id),
    );
    if (allowed.length === 0) {
      return yield* new PermissionDeniedError(
        "Notification rule is outside the API key scope",
      );
    }
  });

/** Check original job source scopes before the history limit, including current loot visibility. */
export const notificationApiKeyJobFilter = (database: ApiDatabaseValue) =>
  Effect.gen(function* () {
    const guilds = yield* notificationApiKeyOrganizations(database);
    if (!guilds) return undefined;
    const identity = yield* requestScopedIdentity;
    const ids = guilds.map((guild) => guild.id);
    const memberships = yield* selectNotificationMemberships(
      database,
      [identity.discordId],
      ids,
    );
    const memberByGuild = new Map(
      (memberships.get(identity.discordId) ?? []).map((member) => [
        member.guildId,
        member,
      ]),
    );
    const sourceGuildIds = sql`${notificationJobTable.payloadSnapshot}->'guildIds'`;
    const visibleSources: SQL[] = guilds.map((guild) => {
      const roles = memberByGuild.get(guild.id)?.roles ?? [];
      const permissions =
        guild.ownerId === identity.discordId
          ? [Permission.OWNER]
          : roles.flatMap((role) => role.permissions);
      const npcVisibility = buildLootNpcVisibilitySql(permissions, roles);
      return sql`(NOT (${sourceGuildIds} ? ${guild.id}) OR EXISTS (
        SELECT 1 FROM "Loot" l INNER JOIN "OrganizationLootRecord" source_record ON source_record."lootId" = l.id
        WHERE l.id::text = ${notificationJobTable.sourceEntityId}
          AND source_record."guildId" = ${guild.id} AND source_record."archivedAt" IS NULL
          ${sql.raw(npcVisibility)}
      ))`;
    });
    const visibleLoot = and(
      eq(notificationJobTable.sourceEntityType, "loot"),
      sql`CASE WHEN jsonb_typeof(${sourceGuildIds}) = 'array' THEN jsonb_array_length(${sourceGuildIds}) > 0 AND ${sourceGuildIds} <@ ${JSON.stringify(ids)}::jsonb ELSE FALSE END`,
      ...visibleSources,
    );
    const personalMessage = and(
      eq(notificationRuleTable.triggerType, "SCHEDULED_MESSAGE"),
      inArray(notificationJobTable.sourceEntityType, [
        "scheduled-message",
        "user-dm-test",
      ]),
    );
    const ruleGuildIds = sql`${notificationRuleTable.filters}->'guildIds'`;
    const visibleRule = or(
      inArray(notificationRuleTable.guildId, ids),
      eq(notificationRuleTable.triggerType, "SCHEDULED_MESSAGE"),
      sql`CASE WHEN jsonb_typeof(${ruleGuildIds}) = 'array' THEN jsonb_array_length(${ruleGuildIds}) > 0 AND ${ruleGuildIds} <@ ${JSON.stringify(ids)}::jsonb ELSE FALSE END`,
    );
    return and(
      visibleRule,
      or(
        inArray(notificationRuleTable.guildId, ids),
        and(
          eq(notificationJobTable.ownerType, "USER"),
          or(personalMessage, visibleLoot),
        ),
      ),
    );
  });
