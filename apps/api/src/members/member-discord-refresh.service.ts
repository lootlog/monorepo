import { DiscordRateLimiterService } from "#src/discord/discord-rate-limiter.service";
import { DiscordSyncDiagnosticsService } from "#src/discord/discord-sync-diagnostics.service";
import {
  isRetryableMemberRefreshStatus,
  MEMBER_DISCORD_SYNC_STATUS,
} from "./member-discord-sync-status.js";
import { MemberDiscordSyncService } from "./member-discord-sync.service.js";
import {
  MemberRefreshSchedulerService,
  type MemberRefreshScheduleResult,
} from "./member-refresh-scheduler.service.js";
import type { MemberRefreshAttempt } from "./member.types.js";

export class MemberDiscordRefreshService {
  private readonly MEMBER_RATE_LIMIT_ENDPOINT = "guild-member";

  constructor(
    private readonly rateLimiter: DiscordRateLimiterService,
    private readonly memberRefreshScheduler: MemberRefreshSchedulerService,
    private readonly diagnostics: DiscordSyncDiagnosticsService,
    private readonly memberDiscordSyncService: MemberDiscordSyncService,
  ) {}

  async refreshGuildMemberWithinBudget(options: {
    discordId: string;
    guildId: string;
    userId: string;
    priority: number;
    reason: string;
    throwOnUnexpectedError?: boolean;
  }): Promise<MemberRefreshAttempt> {
    const {
      discordId,
      guildId,
      userId,
      priority,
      reason,
      throwOnUnexpectedError = false,
    } = options;

    const lockOwner = `request:${guildId}:${Date.now()}:${Math.random()
      .toString(36)
      .slice(2)}`;

    const nextRefreshAt = await this.rateLimiter.getNextAvailableAtForUser(
      userId,
      this.MEMBER_RATE_LIMIT_ENDPOINT,
    );

    if (
      (nextRefreshAt && nextRefreshAt.getTime() > Date.now()) ||
      (await this.memberRefreshScheduler.isUserRefreshLocked(userId))
    ) {
      const scheduledRefresh = await this.queueMemberRefresh({
        discordId,
        guildId,
        userId,
        priority,
        reason,
      });
      if (nextRefreshAt) {
        await this.diagnostics.recordMemberRefreshMetric({
          outcome: "rate_limited",
          reason,
        });
      }

      return {
        member: null,
        status: nextRefreshAt
          ? MEMBER_DISCORD_SYNC_STATUS.RATE_LIMITED
          : MEMBER_DISCORD_SYNC_STATUS.QUEUED,
        refreshQueued: scheduledRefresh.queued,
        nextRefreshAt:
          scheduledRefresh.nextRefreshAt ?? nextRefreshAt ?? new Date(),
      };
    }

    const acquiredLock =
      await this.memberRefreshScheduler.acquireUserRefreshLock(
        userId,
        lockOwner,
      );

    if (!acquiredLock) {
      const scheduledRefresh = await this.queueMemberRefresh({
        discordId,
        guildId,
        userId,
        priority,
        reason,
      });

      return {
        member: null,
        status: MEMBER_DISCORD_SYNC_STATUS.QUEUED,
        refreshQueued: scheduledRefresh.queued,
        nextRefreshAt: scheduledRefresh.nextRefreshAt,
      };
    }

    try {
      const blockedUntil = await this.rateLimiter.getNextAvailableAtForUser(
        userId,
        this.MEMBER_RATE_LIMIT_ENDPOINT,
      );
      if (blockedUntil && blockedUntil.getTime() > Date.now()) {
        const scheduledRefresh = await this.queueMemberRefresh({
          discordId,
          guildId,
          userId,
          priority,
          reason,
        });
        await this.diagnostics.recordMemberRefreshMetric({
          outcome: "rate_limited",
          reason,
        });

        return {
          member: null,
          status: MEMBER_DISCORD_SYNC_STATUS.RATE_LIMITED,
          refreshQueued: scheduledRefresh.queued,
          nextRefreshAt: scheduledRefresh.nextRefreshAt ?? blockedUntil,
        };
      }

      const syncResult =
        await this.memberDiscordSyncService.syncMemberFromDiscord({
          discordId,
          guildId,
          userId,
          throwOnUnexpectedError,
        });

      if (syncResult.status === MEMBER_DISCORD_SYNC_STATUS.RATE_LIMITED) {
        const scheduledRefresh = await this.queueMemberRefresh({
          discordId,
          guildId,
          userId,
          priority,
          reason,
        });

        await this.diagnostics.recordMemberRefreshMetric({
          outcome: "rate_limited",
          reason,
        });

        return {
          ...syncResult,
          refreshQueued: scheduledRefresh.queued,
          nextRefreshAt:
            scheduledRefresh.nextRefreshAt ?? syncResult.nextRefreshAt,
        };
      }

      if (
        !syncResult.member &&
        isRetryableMemberRefreshStatus(syncResult.status)
      ) {
        const scheduledRefresh = await this.queueMemberRefresh({
          discordId,
          guildId,
          userId,
          priority,
          reason,
        });

        return {
          ...syncResult,
          refreshQueued: scheduledRefresh.queued,
          nextRefreshAt:
            scheduledRefresh.nextRefreshAt ?? syncResult.nextRefreshAt,
        };
      }

      return {
        ...syncResult,
        refreshQueued: false,
      };
    } finally {
      await this.memberRefreshScheduler.releaseUserRefreshLock(
        userId,
        lockOwner,
      );
    }
  }

  queueMemberRefresh(options: {
    discordId: string;
    guildId: string;
    userId: string;
    priority: number;
    reason: string;
  }): Promise<MemberRefreshScheduleResult> {
    return this.memberRefreshScheduler.enqueueRefresh(options);
  }
}
