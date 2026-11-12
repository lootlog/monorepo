import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { Clock, Effect } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  memberKillTotalTable,
  memberKillBucketTable,
  memberKillPurgeTable,
  userCharacterKillBucketTable,
  userKillCharacterTable,
  userKillTotalTable,
  userKillBucketTable,
} from "#src/database/drizzle/kill-statistics.schema";
import {
  memberTable,
  memberToRoleTable,
} from "#src/database/drizzle/organization.schema";
import {
  notificationRuleTable,
  notificationTargetTable,
  watchedItemTable,
} from "#src/database/drizzle/notification.schema";
import {
  userCharacterAuraGameAccountTable,
  userCharacterAuraGrantTable,
  userCharacterAuraTable,
  userCharactersLootlogSettingsTable,
  userMargonemAccountTable,
  userSettingDocumentTable,
  userSettingsTable,
  userThemeTable,
} from "#src/database/drizzle/user.schema";
import { userPinnedEventTable } from "#src/database/drizzle/event.schema";
import { userPinnedReservationSpotTable } from "#src/database/drizzle/reservation.schema";
import { NotificationOwnerType } from "#src/notifications/notification-enums";
import {
  getGuildMemberForbiddenCacheKey,
  getGuildMemberNotFoundCacheKey,
} from "#src/discord/discord-cache.util";
import { MEMBER_LAST_DISCORD_STATUS } from "#src/members/member-discord-status";
import {
  getAuthTokenCachePattern,
  getLegacyAuthTokenCacheKey,
  getMemberReadCacheScope,
  getPermissionsCacheKey,
  getUserLootlogConfigCacheScope,
  getUserGuildPermissionsCacheScope,
} from "#src/shared/cache";
import { DependencyUnavailableError } from "#src/shared/http/http-errors";
import {
  type AuthenticatedIdentity,
  AccountOrganizationOperationError,
} from "./account-organization.operations.js";

type RemovedMember = {
  readonly discordId: string;
  readonly guildId: string;
  readonly globalUserId: string | null;
};

export interface UserAccountDeletionPorts {
  readonly cleanupBattlelog: (userId: string) => Effect.Effect<void, unknown>;
  readonly deleteCacheKey: (key: string) => Effect.Effect<unknown, unknown>;
  readonly invalidateCacheScopes: (
    ...scopes: string[]
  ) => Effect.Effect<void, unknown>;
  readonly deleteCachePattern: (
    pattern: string,
  ) => Effect.Effect<unknown, unknown>;
  readonly publishMemberRemoved: (payload: {
    readonly id: string;
    readonly discordId: string;
    readonly userId: string;
    readonly guildId: string;
  }) => Effect.Effect<unknown, unknown>;
}

const deletePersistedAccount = (
  database: typeof ApiDatabase.Service,
  identity: AuthenticatedIdentity,
) =>
  database.transaction((transaction) =>
    Effect.gen(function* () {
      const members = yield* transaction
        .select({
          id: memberTable.id,
          guildId: memberTable.guildId,
          globalUserId: memberTable.globalUserId,
          userId: memberTable.userId,
        })
        .from(memberTable)
        .where(eq(memberTable.userId, identity.discordId));

      const memberIds = members.map(({ id }) => id);
      const deactivatedAt = new Date(yield* Clock.currentTimeMillis);

      // Buckets from this hour on sit in an uncompressed chunk and are deleted
      // now, so kills after a returning member's reactivation are never
      // purged. Older ones would decompress each chunk's Organization segment
      // (hundreds of MB of WAL), so the member kill purge job deletes them off
      // peak.
      const purgeBefore = new Date(
        Math.floor(deactivatedAt.getTime() / 3_600_000) * 3_600_000,
      );

      // Personal kill buckets are segmented by the Discord id, so TimescaleDB
      // deletes their compressed batches without decompressing them.
      yield* transaction.execute(
        sql`select set_config('timescaledb.max_tuples_decompressed_per_dml_transaction', '0', true)`,
      );

      if (memberIds.length > 0) {
        yield* transaction
          .delete(memberKillTotalTable)
          .where(inArray(memberKillTotalTable.memberId, memberIds));
        yield* transaction
          .insert(memberKillPurgeTable)
          .values(
            members.map((member) => ({
              memberId: member.id,
              guildId: member.guildId,
              before: purgeBefore,
            })),
          )
          .onConflictDoUpdate({
            target: memberKillPurgeTable.memberId,
            set: { before: purgeBefore },
          });
      }

      yield* transaction
        .delete(userKillBucketTable)
        .where(eq(userKillBucketTable.discordUserId, identity.discordId));
      yield* transaction
        .delete(userKillTotalTable)
        .where(eq(userKillTotalTable.discordUserId, identity.discordId));
      yield* transaction
        .delete(userCharacterKillBucketTable)
        .where(
          eq(userCharacterKillBucketTable.discordUserId, identity.discordId),
        );
      yield* transaction
        .delete(userKillCharacterTable)
        .where(eq(userKillCharacterTable.discordUserId, identity.discordId));
      yield* transaction
        .delete(userCharactersLootlogSettingsTable)
        .where(
          eq(userCharactersLootlogSettingsTable.userId, identity.discordId),
        );
      yield* transaction
        .delete(userSettingsTable)
        .where(eq(userSettingsTable.userId, identity.userId));
      // Deleting the themes also revokes their share links.
      yield* transaction
        .delete(userThemeTable)
        .where(eq(userThemeTable.userId, identity.userId));
      yield* transaction
        .delete(userSettingDocumentTable)
        .where(eq(userSettingDocumentTable.userId, identity.userId));
      yield* transaction
        .delete(userCharacterAuraTable)
        .where(eq(userCharacterAuraTable.userId, identity.userId));
      yield* transaction
        .delete(userCharacterAuraGrantTable)
        .where(eq(userCharacterAuraGrantTable.userId, identity.userId));
      yield* transaction
        .delete(userCharacterAuraGameAccountTable)
        .where(eq(userCharacterAuraGameAccountTable.userId, identity.userId));
      yield* transaction
        .delete(userMargonemAccountTable)
        .where(eq(userMargonemAccountTable.userId, identity.userId));
      yield* transaction
        .delete(userPinnedEventTable)
        .where(eq(userPinnedEventTable.userId, identity.userId));
      yield* transaction
        .delete(userPinnedReservationSpotTable)
        .where(eq(userPinnedReservationSpotTable.userId, identity.userId));
      // Personal notifications are keyed by the Discord id. Deleting rules and
      // targets cascades to their links and pending jobs.
      yield* transaction
        .delete(watchedItemTable)
        .where(eq(watchedItemTable.userId, identity.discordId));
      yield* transaction
        .delete(notificationRuleTable)
        .where(
          and(
            eq(notificationRuleTable.ownerType, NotificationOwnerType.USER),
            eq(notificationRuleTable.ownerId, identity.discordId),
          ),
        );
      yield* transaction
        .delete(notificationTargetTable)
        .where(
          and(
            eq(notificationTargetTable.ownerType, NotificationOwnerType.USER),
            eq(notificationTargetTable.ownerId, identity.discordId),
          ),
        );

      for (const member of members) {
        yield* transaction
          .delete(memberKillBucketTable)
          .where(
            and(
              eq(memberKillBucketTable.guildId, member.guildId),
              eq(memberKillBucketTable.memberId, member.id),
              gte(memberKillBucketTable.periodStart, purgeBefore),
            ),
          );
        yield* transaction
          .delete(memberToRoleTable)
          .where(eq(memberToRoleTable.A, member.id));
        yield* transaction
          .update(memberTable)
          .set({
            active: false,
            lastDiscordAttemptAt: deactivatedAt,
            lastDiscordStatus: MEMBER_LAST_DISCORD_STATUS.ACCOUNT_DELETED,
            updatedAt: deactivatedAt,
          })
          .where(
            and(
              eq(memberTable.id, member.id),
              eq(memberTable.guildId, member.guildId),
            ),
          );
      }

      return members.map((member): RemovedMember => ({
        discordId: member.userId,
        guildId: member.guildId,
        globalUserId: member.globalUserId,
      }));
    }),
  );

const invalidateRemovedMember = (
  ports: UserAccountDeletionPorts,
  member: RemovedMember,
) => {
  const effects: Array<Effect.Effect<unknown, unknown>> = [
    ports.invalidateCacheScopes(
      getUserLootlogConfigCacheScope(member.discordId),
      getUserGuildPermissionsCacheScope(member.discordId),
    ),
    ports.invalidateCacheScopes(getMemberReadCacheScope(member.guildId)),
  ];

  if (member.globalUserId) {
    effects.push(
      ports.deleteCacheKey(
        getGuildMemberNotFoundCacheKey({
          discordId: member.discordId,
          guildId: member.guildId,
          userId: member.globalUserId,
        }),
      ),
      ports.deleteCacheKey(
        getGuildMemberForbiddenCacheKey({
          discordId: member.discordId,
          guildId: member.guildId,
          userId: member.globalUserId,
        }),
      ),
      ports.deleteCacheKey(
        getPermissionsCacheKey(member.globalUserId, member.guildId),
      ),
    );
  }

  return Effect.all(effects, { concurrency: "unbounded", discard: true }).pipe(
    Effect.andThen(
      member.globalUserId
        ? ports.publishMemberRemoved({
            id: member.discordId,
            discordId: member.discordId,
            userId: member.globalUserId,
            guildId: member.guildId,
          })
        : Effect.void,
    ),
  );
};

export const makeUserAccountDeletion = (
  database: typeof ApiDatabase.Service,
  ports: UserAccountDeletionPorts,
) => {
  const deleteAccount = Effect.fn("deleteAccount")(function* (
    identity: AuthenticatedIdentity,
  ) {
    yield* ports.cleanupBattlelog(identity.userId).pipe(
      Effect.mapError(
        () =>
          new DependencyUnavailableError({
            code: "BATTLELOG_SERVICE_UNAVAILABLE",
            retryAfterMs: 60_000,
          }),
      ),
    );

    const removedMembers = yield* deletePersistedAccount(database, identity);
    yield* Effect.all(
      [
        ports.deleteCachePattern(getAuthTokenCachePattern(identity.userId)),
        ports.deleteCacheKey(getLegacyAuthTokenCacheKey(identity.userId)),
        ports.invalidateCacheScopes(
          getUserLootlogConfigCacheScope(identity.discordId),
          getUserGuildPermissionsCacheScope(identity.discordId),
        ),
        ...removedMembers.map((member) =>
          invalidateRemovedMember(ports, member),
        ),
      ],
      { concurrency: "unbounded", discard: true },
    );
  });

  return (identity: AuthenticatedIdentity) =>
    deleteAccount(identity).pipe(
      Effect.mapError(
        (cause) => new AccountOrganizationOperationError({ cause }),
      ),
    );
};
