import { and, eq, exists, isNull, not, or, sql } from "drizzle-orm";
import { Effect } from "effect";
import { Permission } from "@lootlog/schema/permissions";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import {
  type guildTable,
  lootTable,
  notificationJobTable,
  organizationLootRecordTable,
} from "#src/database/drizzle/schema";
import { buildLootNpcVisibilityCondition } from "#src/loots/loot-visibility";
import { selectAccessibleGuilds } from "#src/members/member-access-query";
import { selectNotificationMemberships } from "#src/notifications/rules/notification-matching.service";

/** Every Organization named in the retained payload must still expose its source loot. */
export const notificationLootSourceCondition = Effect.fnUntraced(function* (
  database: ApiDatabaseValue,
  discordId: string,
  scopedGuilds?: ReadonlyArray<typeof guildTable.$inferSelect>,
) {
  const guilds =
    scopedGuilds ??
    (yield* selectAccessibleGuilds(database, discordId)).map(
      ({ guild }) => guild,
    );

  const ids = guilds.map((guild) => guild.id);

  const memberships = yield* selectNotificationMemberships(
    database,
    [discordId],
    ids,
  );

  const memberByGuild = new Map(
    (memberships.get(discordId) ?? []).map((member) => [
      member.guildId,
      member,
    ]),
  );

  const sourceGuildIds = sql`${notificationJobTable.payloadSnapshot}->'guildIds'`;
  // Keep the indexed Loot.id uncast, and reject malformed legacy identifiers before casting.
  const sourceLootId = sql`CASE WHEN ${notificationJobTable.sourceEntityId} ~ '^[1-9][0-9]{0,9}$' THEN ${notificationJobTable.sourceEntityId}::bigint ELSE NULL END`;

  const visibleSources = guilds.map((guild) => {
    const roles = memberByGuild.get(guild.id)?.roles ?? [];

    const permissions =
      guild.ownerId === discordId
        ? [Permission.OWNER]
        : roles.flatMap((role) => role.permissions);

    return or(
      not(sql`${sourceGuildIds} ? ${guild.id}`),
      exists(
        database
          .select({ id: lootTable.id })
          .from(lootTable)
          .innerJoin(
            organizationLootRecordTable,
            eq(organizationLootRecordTable.lootId, lootTable.id),
          )
          .where(
            and(
              eq(lootTable.id, sourceLootId),
              eq(organizationLootRecordTable.guildId, guild.id),
              isNull(organizationLootRecordTable.archivedAt),
              buildLootNpcVisibilityCondition(lootTable.id, permissions, roles),
            ),
          ),
      ),
    );
  });

  return (
    and(
      eq(notificationJobTable.sourceEntityType, "loot"),
      sql`CASE WHEN jsonb_typeof(${sourceGuildIds}) = 'array' THEN jsonb_array_length(${sourceGuildIds}) > 0 AND ${sourceGuildIds} <@ ${JSON.stringify(ids)}::jsonb ELSE FALSE END`,
      ...visibleSources,
    ) ?? sql`false`
  );
});

export const canDispatchLootNotification = Effect.fnUntraced(function* (
  database: ApiDatabaseValue,
  jobId: string,
  discordId: string,
) {
  const visibleSource = yield* notificationLootSourceCondition(
    database,
    discordId,
  );

  const jobs = yield* database
    .select({ id: notificationJobTable.id })
    .from(notificationJobTable)
    .where(
      and(
        eq(notificationJobTable.id, jobId),
        eq(notificationJobTable.ownerType, "USER"),
        eq(notificationJobTable.ownerId, discordId),
        visibleSource,
      ),
    )
    .limit(1);

  return jobs.length > 0;
});
