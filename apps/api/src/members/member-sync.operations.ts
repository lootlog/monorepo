import { TaggedError as TaggedErrorClass } from "effect/Schema";
import type { APIGuildMember } from "discord-api-types/v10";
import { Effect, Schema } from "effect";
import {
  HttpException,
  HttpStatus,
  NotFoundException,
} from "#src/shared/http/http-errors";
import type { ApplicationLogger as Logger } from "#src/shared/logging/application-logger";
import { DiscordOperationFailure } from "#src/discord/discord.operations";
import {
  getTransientMemberSyncStatus,
  MEMBER_DISCORD_SYNC_STATUS,
} from "./member-discord-sync-status.js";
import type { MemberRemoval } from "./member-removal.operations.js";
import type { MemberStore } from "./member.store.js";
import type { MemberSyncResult } from "./member.types.js";

export class MemberSyncFailure extends TaggedErrorClass<MemberSyncFailure>()(
  "MemberSyncFailure",
  { operation: Schema.String, cause: Schema.Defect() },
) {}

export interface MemberSyncPorts {
  readonly getGuildMember: (options: {
    readonly guildId: string;
    readonly userId: string;
    readonly discordId: string;
  }) => Effect.Effect<APIGuildMember, unknown>;
  readonly nextRefreshAt: (
    userId: string,
  ) => Effect.Effect<Date | null, unknown>;
  readonly invalidateMember: (options: {
    readonly discordId: string;
    readonly guildId: string;
    readonly userId: string;
  }) => Effect.Effect<unknown, unknown>;
}

export const makeMemberSync = (
  logger: Logger,
  store: MemberStore,
  removal: MemberRemoval,
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
      const existing = yield* store.findMember(
        options.discordId,
        options.guildId,
      );
      if (!existing) return null;
      const member = yield* store.markSyncAttempt({
        userId: options.discordId,
        guildId: options.guildId,
        status: options.status,
        deactivate: options.deactivate ?? false,
        markSynced: options.markSynced ?? false,
        attemptedAt: new Date(),
      });
      if (options.deactivate && existing.active) {
        yield* removal.notifyMemberRemoved({
          discordId: options.discordId,
          guildId: options.guildId,
          globalUserId: existing.globalUserId,
        });
      }
      return member;
    },
  );

  const createOrUpdateMember = Effect.fn("members.sync.upsert")(function* (
    discordMember: APIGuildMember & {
      readonly guildId: string;
      readonly globalUserId: string;
    },
  ) {
    const syncTimestamp = new Date();
    const existingRoleIds = yield* store.findExistingRoleIds(
      discordMember.roles,
      discordMember.guildId,
    );
    const member = yield* store.upsertMemberWithRoles(
      discordMember.user.id,
      discordMember.guildId,
      {
        avatar: discordMember.avatar ?? discordMember.user.avatar,
        banner: discordMember.banner,
        name:
          discordMember.nick ??
          discordMember.user.global_name ??
          discordMember.user.username,
        active: true,
        globalUserId: discordMember.globalUserId,
        lastDiscordAttemptAt: syncTimestamp,
        lastDiscordSyncAt: syncTimestamp,
        lastDiscordStatus: MEMBER_DISCORD_SYNC_STATUS.SUCCESS,
      },
      existingRoleIds,
    );
    yield* ports.invalidateMember({
      discordId: discordMember.user.id,
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
      if (result._tag === "Success") {
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
        result.failure instanceof DiscordOperationFailure
          ? result.failure.cause
          : result.failure;
      if (error instanceof NotFoundException) {
        const member = yield* markAttempt({
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
        error instanceof HttpException &&
        error.getStatus() === HttpStatus.UNAUTHORIZED
      ) {
        const member = yield* markAttempt({
          discordId: options.discordId,
          guildId: options.guildId,
          status: MEMBER_DISCORD_SYNC_STATUS.UNAUTHORIZED,
        });
        return {
          member,
          status: MEMBER_DISCORD_SYNC_STATUS.UNAUTHORIZED,
          error,
          nextRefreshAt: null,
        } satisfies MemberSyncResult;
      }
      if (
        error instanceof HttpException &&
        error.getStatus() === HttpStatus.TOO_MANY_REQUESTS
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
      logger.log({
        level:
          status === MEMBER_DISCORD_SYNC_STATUS.AUTH_SERVICE_UNAVAILABLE
            ? "warn"
            : "error",
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
          new MemberSyncFailure({
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

  return { syncMemberFromDiscord, createOrUpdateMember };
};

export type MemberSync = ReturnType<typeof makeMemberSync>;
