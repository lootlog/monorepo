import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Inject, Injectable } from "@nestjs/common";
import type { Job } from "bullmq";
import { setTimeout as sleep } from "node:timers/promises";
import { APPLICATION_LOGGER } from "#src/shared/logging/logger-token";
import type { Logger } from "winston";
import { DiscordSyncDiagnosticsService } from "#src/discord/discord-sync-diagnostics.service";
import { MEMBER_REFRESH_QUEUE } from "./constants/member-refresh-queue.constant.js";
import {
  MemberRefreshSchedulerService,
  type MemberRefreshJobData,
} from "./member-refresh-scheduler.service.js";
import { MembersService } from "./members.service.js";
import { isRetryableMemberRefreshStatus } from "./member-discord-sync-status.js";

@Injectable()
@Processor(MEMBER_REFRESH_QUEUE, {
  concurrency: 10,
})
export class MemberRefreshProcessor extends WorkerHost {
  constructor(
    @Inject(APPLICATION_LOGGER) private readonly logger: Logger,
    private readonly membersService: MembersService,
    private readonly scheduler: MemberRefreshSchedulerService,
    private readonly diagnostics: DiscordSyncDiagnosticsService,
  ) {
    super();
  }

  async process(job: Job<MemberRefreshJobData>): Promise<void> {
    const lockOwner = `job:${job.id}`;
    const startedAt =
      typeof job.timestamp === "number" ? job.timestamp : Date.now();
    const acquiredLock = await this.scheduler.acquireUserRefreshLock(
      job.data.userId,
      lockOwner,
    );

    if (!acquiredLock) {
      await this.diagnostics.recordMemberRefreshMetric({
        outcome: "failed",
        reason: "MEMBER_REFRESH_LOCKED",
      });
      throw new Error("MEMBER_REFRESH_LOCKED");
    }

    let failureRecorded = false;

    try {
      const nextRefreshAt = await this.scheduler.getNextRefreshAt(
        job.data.userId,
      );
      if (nextRefreshAt && nextRefreshAt.getTime() > Date.now()) {
        const waitMs = nextRefreshAt.getTime() - Date.now();
        await this.scheduler.extendUserRefreshLock(
          job.data.userId,
          lockOwner,
          Math.ceil(waitMs / 1000) + 30,
        );
        await sleep(waitMs);
      }

      const result = await this.membersService.syncMemberFromDiscord({
        discordId: job.data.discordId,
        guildId: job.data.guildId,
        userId: job.data.userId,
      });

      if (isRetryableMemberRefreshStatus(result.status)) {
        if (result.status === "RATE_LIMITED") {
          await this.diagnostics.recordMemberRefreshMetric({
            outcome: "rate_limited",
            reason: job.data.reason,
          });
        }

        await this.diagnostics.recordMemberRefreshMetric({
          outcome: "failed",
          reason: result.status,
        });
        failureRecorded = true;
        throw new Error(`MEMBER_REFRESH_${result.status}`);
      }

      await this.diagnostics.recordMemberRefreshMetric({
        outcome: "processed",
        reason: result.status,
      });

      this.logger.log({
        level: "debug",
        message: "Processed queued member refresh job",
        jobId: job.id,
        guildId: job.data.guildId,
        userId: job.data.userId,
        reason: job.data.reason,
      });
    } catch (error) {
      if (!failureRecorded) {
        await this.diagnostics.recordMemberRefreshMetric({
          outcome: "failed",
          reason: (error as Error).message,
        });
      }

      throw error;
    } finally {
      await this.diagnostics.recordMemberRefreshLatency(Date.now() - startedAt);
      await this.scheduler.releaseUserRefreshLock(job.data.userId, lockOwner);
    }
  }
}
