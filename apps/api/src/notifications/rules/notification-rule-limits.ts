import {
  ResourceConflictError,
  ResourceNotFoundError,
} from "@lootlog/protocol/http/errors";
import { NotificationOwnerType } from "@lootlog/schema/notifications";
import { and, count, eq, isNull, ne, or } from "drizzle-orm";
import { Effect } from "effect";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import {
  notificationRuleTable,
  watchedItemTable,
} from "#src/database/drizzle/notification.schema";
import { guildTable } from "#src/database/drizzle/organization.schema";
import { Error as NotificationError } from "#src/notifications/error";
import {
  readOrganizationLimits,
  readUserEntitlements,
} from "#src/plans/entitlements";
import { RESERVATION_REMINDER_RULE_NAME } from "./reservation-reminder.js";

export const notificationRuleLimits = (database: ApiDatabaseValue) => {
  const countGuildRules = (guildId: string) =>
    database
      .select({ value: count() })
      .from(notificationRuleTable)
      .where(
        and(
          eq(notificationRuleTable.ownerType, NotificationOwnerType.GUILD),
          eq(notificationRuleTable.ownerId, guildId),
        ),
      )
      .pipe(Effect.map((rows) => rows[0]?.value ?? 0));

  const countPersonalRules = (discordId: string) =>
    database
      .select({ value: count() })
      .from(notificationRuleTable)
      .leftJoin(
        watchedItemTable,
        eq(watchedItemTable.notificationRuleId, notificationRuleTable.id),
      )
      .where(
        and(
          eq(notificationRuleTable.ownerType, NotificationOwnerType.USER),
          eq(notificationRuleTable.ownerId, discordId),
          isNull(watchedItemTable.id),
          or(
            isNull(notificationRuleTable.name),
            ne(notificationRuleTable.name, RESERVATION_REMINDER_RULE_NAME),
          ),
        ),
      )
      .pipe(Effect.map((rows) => rows[0]?.value ?? 0));

  const ensureUserRuleLimit = (discordId: string, userId: string) =>
    Effect.gen(function* () {
      const [ruleCount, limits] = yield* Effect.all(
        [countPersonalRules(discordId), readUserEntitlements(database, userId)],
        { concurrency: 2 },
      );

      if (ruleCount >= limits.notificationRules) {
        return yield* new ResourceConflictError({
          code: NotificationError.USER_NOTIFICATION_RULE_LIMIT_REACHED,
          details: { ruleLimit: limits.notificationRules, ruleCount },
        });
      }
    });

  const ensureGuildRuleLimit = (guildId: string) =>
    Effect.gen(function* () {
      const guilds = yield* database
        .select({ id: guildTable.id })
        .from(guildTable)
        .where(eq(guildTable.id, guildId))
        .limit(1);

      if (!guilds[0]) {
        return yield* new ResourceNotFoundError({
          code: NotificationError.GUILD_NOT_FOUND,
        });
      }

      const [ruleCount, limits] = yield* Effect.all(
        [countGuildRules(guildId), readOrganizationLimits(database, guildId)],
        { concurrency: 2 },
      );

      if (ruleCount >= limits.notificationRules) {
        return yield* new ResourceConflictError({
          code: NotificationError.GUILD_NOTIFICATION_RULE_LIMIT_REACHED,
          details: { ruleLimit: limits.notificationRules, ruleCount },
        });
      }
    });

  return { countGuildRules, ensureGuildRuleLimit, ensureUserRuleLimit };
};
