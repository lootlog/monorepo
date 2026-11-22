import { OperationError } from "@lootlog/instrumentation/operation";
import { getDiscordServerAvatarUrl } from "@lootlog/domain/discord-avatar";
import type { APIGuildMember } from "discord-api-types/v10";
import { Clock, Effect, Result } from "effect";
import {
  ApplicationError,
  ApplicationErrorKind,
  ResourceNotFoundError,
} from "@lootlog/protocol/http/errors";
import {
  getTransientMemberSyncStatus,
  isDiscordRefusalSyncStatus,
  MEMBER_DISCORD_SYNC_STATUS,
} from "./member-discord-sync-status.js";
import type { MemberDelivery } from "./member-delivery.operations.js";
import type { MemberStore } from "./member.repository.js";
import type { RedisError } from "effect/persistence/Redis";
import type { MemberSyncResult } from "./member.types.js";

export interface MemberSyncPorts {
  readonly getGuildMember: (options: {
    readonly guildId: string;
    readonly userId: string;
    readonly discordId: string;
  }) => Effect.Effect<APIGuildMember, unknown>;
  readonly nextRefreshAt: (
    userId: string,
  ) => Effect.Effect<Date | null, unknown>;
  readonly refreshPermissionCache: (options: {
    readonly guildId: string;
    readonly userId: string;
  }) => Effect.Effect<void, RedisError>;
}

export const makeMemberSync = (
  store: MemberStore,
  delivery: Pick<MemberDelivery, "deliver">,
  ports: MemberSyncPorts,
) => {
  const markAttempt = Effect.fn("members.sync.markAttempt")(
    function* (options: {
      readonly discordId: string;
      readonly guildId: string;
      readonly status: string;
      readonly deactivate?: boolean;
      readonly markSynced?: boolean;
    }) {
      const attempt = yield* store.markSyncAttempt({
        userId: options.discordId,
        guildId: options.guildId,
        status: options.status,
        deactivate: options.deactivate ?? false,
        markSynced: options.markSynced ?? false,
        attemptedAt: new Date(yield* Clock.currentTimeMillis),
      });

      if (attempt) yield* delivery.deliver(attempt.member.id);

      return {
        member: attempt?.member ?? null,
        statusChanged: attempt?.statusChanged ?? true,
      };
    },
  );

  const createOrUpdateMember = Effect.fn("members.sync.upsert")(function* (
    discordMember: APIGuildMember & {
      readonly guildId: string;
      readonly globalUserId: string;
    },
  ) {
    const syncTimestamp = new Date(yield* Clock.currentTimeMillis);

    const member = yield* store.upsertMemberWithRoles(
      discordMember.user.id,
      discordMember.guildId,
      {
        avatar: discordMember.avatar
          ? getDiscordServerAvatarUrl(
              discordMember.guildId,
              discordMember.user.id,
              discordMember.avatar,
            )
          : (discordMember.user.avatar ?? null),
        globalAvatar: discordMember.user.avatar ?? null,
        banner: discordMember.banner ?? null,
        username: discordMember.user.username,
        joinedAt: discordMember.joined_at
          ? new Date(discordMember.joined_at)
          : null,
        name:
          discordMember.nick ??
          discordMember.user.global_name ??
          discordMember.user.username,
        discordDisplayName:
          discordMember.user.global_name ?? discordMember.user.username,
        active: true,
        globalUserId: discordMember.globalUserId,
        lastDiscordAttemptAt: syncTimestamp,
        lastDiscordSyncAt: syncTimestamp,
        lastDiscordStatus: MEMBER_DISCORD_SYNC_STATUS.SUCCESS,
      },
      discordMember.roles,
    );

    yield* delivery.deliver(member.id);
    yield* ports.refreshPermissionCache({
      guildId: discordMember.guildId,
      userId: discordMember.globalUserId,
    });

    return member;
  });

  const syncMemberFromDiscord = Effect.fn("members.sync.discord")(
    function* (options: {
      readonly discordId: string;
      readonly guildId: string;
      readonly userId: string;
      readonly throwOnUnexpectedError?: boolean;
    }) {
      const result = yield* Effect.result(
        ports.getGuildMember({
          guildId: options.guildId,
          userId: options.userId,
          discordId: options.discordId,
        }),
      );

      if (Result.isSuccess(result)) {
        const member = yield* createOrUpdateMember({
          ...result.success,
          guildId: options.guildId,
          globalUserId: options.userId,
        });

        return {
          member,
          status: MEMBER_DISCORD_SYNC_STATUS.SUCCESS,
          nextRefreshAt: null,
        } satisfies MemberSyncResult;
      }

      const error =
        result.failure instanceof OperationError
          ? result.failure.cause
          : result.failure;

      if (error instanceof ResourceNotFoundError) {
        const { member } = yield* markAttempt({
          discordId: options.discordId,
          guildId: options.guildId,
          status: MEMBER_DISCORD_SYNC_STATUS.NOT_FOUND,
          deactivate: true,
          markSynced: true,
        });

        return {
          member,
          status: MEMBER_DISCORD_SYNC_STATUS.NOT_FOUND,
          error,
          nextRefreshAt: null,
        } satisfies MemberSyncResult;
      }

      if (
        error instanceof ApplicationError &&
        error.kind === ApplicationErrorKind.AUTHENTICATION_REQUIRED
      ) {
        const { member, statusChanged } = yield* markAttempt({
          discordId: options.discordId,
          guildId: options.guildId,
          status: MEMBER_DISCORD_SYNC_STATUS.UNAUTHORIZED,
        });

        yield* (statusChanged ? Effect.logWarning : Effect.logDebug)({
          message: "Member must sign in again to refresh from Discord",
          guildId: options.guildId,
          userId: options.userId,
          code: error.body.code,
        });

        return {
          member,
          status: MEMBER_DISCORD_SYNC_STATUS.UNAUTHORIZED,
          error,
          nextRefreshAt: null,
        } satisfies MemberSyncResult;
      }

      if (
        error instanceof ApplicationError &&
        error.kind === ApplicationErrorKind.RATE_LIMITED
      ) {
        const nextRefreshAt = yield* ports.nextRefreshAt(options.userId);
        yield* markAttempt({
          discordId: options.discordId,
          guildId: options.guildId,
          status: MEMBER_DISCORD_SYNC_STATUS.RATE_LIMITED,
        });

        return {
          member: null,
          status: MEMBER_DISCORD_SYNC_STATUS.RATE_LIMITED,
          error,
          nextRefreshAt,
        } satisfies MemberSyncResult;
      }

      const status = getTransientMemberSyncStatus(error);
      yield* (
        status === MEMBER_DISCORD_SYNC_STATUS.AUTH_SERVICE_UNAVAILABLE ||
          isDiscordRefusalSyncStatus(status)
          ? Effect.logWarning
          : Effect.logError
      )({
        message: "Failed to refresh member from Discord; cached state retained",
        guildId: options.guildId,
        userId: options.discordId,
        status,
      });
      yield* markAttempt({
        discordId: options.discordId,
        guildId: options.guildId,
        status,
      });

      if (options.throwOnUnexpectedError) {
        return yield* Effect.fail(
          new OperationError({
            operation: "members.sync.discord",
            cause: error,
          }),
        );
      }

      return {
        member: null,
        status,
        error,
        nextRefreshAt: null,
      } satisfies MemberSyncResult;
    },
  );

  return {
    syncMemberFromDiscord,
    createOrUpdateMember,
  };
};

export type MemberSync = ReturnType<typeof makeMemberSync>;
