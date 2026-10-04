import { and, eq, inArray, sql } from "drizzle-orm";
import { Clock, Effect } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  memberKillTotalTable,
  memberKillBucketTable,
  memberTable,
  memberToRoleTable,
  userCharactersLootlogSettingsTable,
  userKillTotalTable,
  userKillBucketTable,
  userPinnedEventTable,
  userSettingDocumentTable,
  userSettingsTable,
} from "#src/database/drizzle/schema";
import {
  getGuildMemberCacheKeys,
  getLegacyGuildMemberCacheKeys,
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

      // Compressed kill buckets are segmented by Organization, so removing one
      // member decompresses that Organization's segments in each chunk.
      yield* transaction.execute(
        sql`select set_config('timescaledb.max_tuples_decompressed_per_dml_transaction', '0', true)`,
      );

      if (memberIds.length > 0) {
        yield* transaction
          .delete(memberKillBucketTable)
          .where(inArray(memberKillBucketTable.memberId, memberIds));
        yield* transaction
          .delete(memberKillTotalTable)
          .where(inArray(memberKillTotalTable.memberId, memberIds));
      }

      yield* transaction
        .delete(userKillBucketTable)
        .where(eq(userKillBucketTable.discordUserId, identity.discordId));
      yield* transaction
        .delete(userKillTotalTable)
        .where(eq(userKillTotalTable.discordUserId, identity.discordId));
      yield* transaction
        .delete(userCharactersLootlogSettingsTable)
        .where(
          eq(userCharactersLootlogSettingsTable.userId, identity.discordId),
        );
      yield* transaction
        .delete(userSettingsTable)
        .where(eq(userSettingsTable.userId, identity.userId));
      yield* transaction
        .delete(userSettingDocumentTable)
        .where(eq(userSettingDocumentTable.userId, identity.userId));
      yield* transaction
        .delete(userPinnedEventTable)
        .where(eq(userPinnedEventTable.userId, identity.userId));

      const deactivatedAt = new Date(yield* Clock.currentTimeMillis);

      for (const member of members) {
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
  const cacheKeys = member.globalUserId
    ? getGuildMemberCacheKeys({
        discordId: member.discordId,
        guildId: member.guildId,
        userId: member.globalUserId,
      })
    : null;

  const legacyCacheKeys = member.globalUserId
    ? getLegacyGuildMemberCacheKeys({
        guildId: member.guildId,
        userId: member.globalUserId,
      })
    : null;

  const effects: Array<Effect.Effect<unknown, unknown>> = [
    ports.invalidateCacheScopes(
      getUserLootlogConfigCacheScope(member.discordId),
      getUserGuildPermissionsCacheScope(member.discordId),
    ),
    ports.invalidateCacheScopes(getMemberReadCacheScope(member.guildId)),
  ];

  if (member.globalUserId && cacheKeys && legacyCacheKeys) {
    effects.push(
      ports.deleteCacheKey(cacheKeys.data),
      ports.deleteCacheKey(cacheKeys.notFound),
      ports.deleteCacheKey(cacheKeys.unauthorized),
      ports.deleteCacheKey(legacyCacheKeys.data),
      ports.deleteCacheKey(legacyCacheKeys.notFound),
      ports.deleteCacheKey(legacyCacheKeys.unauthorized),
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
      Effect.catch(() =>
        Effect.fail(
          new DependencyUnavailableError({
            message: "BATTLELOG_SERVICE_UNAVAILABLE",
            retryAfter: 60,
          }),
        ),
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
