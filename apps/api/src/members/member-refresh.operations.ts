import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Clock, Effect, Schema } from "effect";
import {
  isRetryableMemberRefreshStatus,
  MEMBER_DISCORD_SYNC_STATUS,
} from "./member-discord-sync-status.js";
import type {
  MemberRefreshScheduleResult,
  MemberRefreshScheduler,
} from "./member-refresh-scheduler.js";
import type { MemberRefreshAttempt, MemberSyncResult } from "./member.types.js";

export class MemberRefreshFailure extends TaggedErrorClass<MemberRefreshFailure>()(
  "MemberRefreshFailure",
  { operation: Schema.String, cause: Schema.Defect() },
) {}

export interface MemberRefreshPorts {
  readonly nextRefreshAt: (
    userId: string,
  ) => Effect.Effect<Date | null, unknown>;
  readonly recordMetric: (options: {
    readonly outcome: "rate_limited";
    readonly reason: string;
  }) => Effect.Effect<unknown, unknown>;
  readonly syncMember: (options: {
    readonly discordId: string;
    readonly guildId: string;
    readonly userId: string;
    readonly throwOnUnexpectedError?: boolean;
  }) => Effect.Effect<MemberSyncResult, unknown>;
}

export const makeMemberRefresh = (
  scheduler: MemberRefreshScheduler,
  ports: MemberRefreshPorts,
) => {
  const queueMemberRefresh = (options: {
    readonly discordId: string;
    readonly guildId: string;
    readonly userId: string;
    readonly priority: number;
    readonly reason: string;
  }): Effect.Effect<MemberRefreshScheduleResult, unknown> =>
    scheduler.enqueueRefresh(options);

  const refreshGuildMemberWithinBudget = Effect.fn(
    "members.refresh.withinBudget",
  )(function* (options: {
    readonly discordId: string;
    readonly guildId: string;
    readonly userId: string;
    readonly priority: number;
    readonly reason: string;
    readonly throwOnUnexpectedError?: boolean;
  }) {
    const lockOwner = `request:${options.guildId}:${yield* Clock.currentTimeMillis}:${Math.random()
      .toString(36)
      .slice(2)}`;
    const nextRefreshAt = yield* ports.nextRefreshAt(options.userId);
    const locked = yield* scheduler.isUserRefreshLocked(options.userId);
    if (
      (nextRefreshAt &&
        nextRefreshAt.getTime() > (yield* Clock.currentTimeMillis)) ||
      locked
    ) {
      const scheduled = yield* queueMemberRefresh(options);
      if (nextRefreshAt) {
        yield* ports.recordMetric({
          outcome: "rate_limited",
          reason: options.reason,
        });
      }
      return {
        member: null,
        status: nextRefreshAt
          ? MEMBER_DISCORD_SYNC_STATUS.RATE_LIMITED
          : MEMBER_DISCORD_SYNC_STATUS.QUEUED,
        refreshQueued: scheduled.queued,
        nextRefreshAt:
          scheduled.nextRefreshAt ??
          nextRefreshAt ??
          new Date(yield* Clock.currentTimeMillis),
      };
    }
    const acquired = yield* scheduler.acquireUserRefreshLock(
      options.userId,
      lockOwner,
    );
    if (!acquired) {
      const scheduled = yield* queueMemberRefresh(options);
      return {
        member: null,
        status: MEMBER_DISCORD_SYNC_STATUS.QUEUED,
        refreshQueued: scheduled.queued,
        nextRefreshAt: scheduled.nextRefreshAt,
      };
    }
    const execute = Effect.gen(function* () {
      const blockedUntil = yield* ports.nextRefreshAt(options.userId);
      if (
        blockedUntil &&
        blockedUntil.getTime() > (yield* Clock.currentTimeMillis)
      ) {
        const scheduled = yield* queueMemberRefresh(options);
        yield* ports.recordMetric({
          outcome: "rate_limited",
          reason: options.reason,
        });
        return {
          member: null,
          status: MEMBER_DISCORD_SYNC_STATUS.RATE_LIMITED,
          refreshQueued: scheduled.queued,
          nextRefreshAt: scheduled.nextRefreshAt ?? blockedUntil,
        } satisfies MemberRefreshAttempt;
      }
      const syncResult = yield* ports.syncMember({
        discordId: options.discordId,
        guildId: options.guildId,
        userId: options.userId,
        throwOnUnexpectedError: options.throwOnUnexpectedError,
      });
      if (
        syncResult.status === MEMBER_DISCORD_SYNC_STATUS.RATE_LIMITED ||
        (!syncResult.member &&
          isRetryableMemberRefreshStatus(syncResult.status))
      ) {
        const scheduled = yield* queueMemberRefresh(options);
        if (syncResult.status === MEMBER_DISCORD_SYNC_STATUS.RATE_LIMITED) {
          yield* ports.recordMetric({
            outcome: "rate_limited",
            reason: options.reason,
          });
        }
        return {
          ...syncResult,
          refreshQueued: scheduled.queued,
          nextRefreshAt: scheduled.nextRefreshAt ?? syncResult.nextRefreshAt,
        } satisfies MemberRefreshAttempt;
      }
      return {
        ...syncResult,
        refreshQueued: false,
      } satisfies MemberRefreshAttempt;
    });
    return yield* execute.pipe(
      Effect.ensuring(
        scheduler
          .releaseUserRefreshLock(options.userId, lockOwner)
          .pipe(Effect.ignore),
      ),
      Effect.mapError(
        (cause) =>
          new MemberRefreshFailure({
            operation: "members.refresh.withinBudget",
            cause,
          }),
      ),
    );
  });

  return { refreshGuildMemberWithinBudget, queueMemberRefresh };
};

export type MemberRefresh = ReturnType<typeof makeMemberRefresh>;
