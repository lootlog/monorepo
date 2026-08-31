import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Inject, Injectable } from "@nestjs/common";
import type { Job } from "bullmq";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import type { Logger } from "winston";
import { PrismaService } from "#src/db/prisma.service";
import { MEMBER_BULK_REFRESH_QUEUE } from "./constants/member-refresh-queue.constant.js";
import { MemberRefreshJobEventsService } from "./member-refresh-job-events.service.js";
import { MembersService } from "./members.service.js";
import type { MemberBulkRefreshJobData } from "./member.types.js";
import { dateToTemporal } from "#src/db/temporal";

interface JobProgress {
  processedCount: number;
  refreshedIds: string[];
  skippedIds: string[];
  failedIds: string[];
}

@Injectable()
@Processor(MEMBER_BULK_REFRESH_QUEUE, {
  concurrency: 5,
  limiter: {
    max: 5,
    duration: 1000,
  },
})
export class MemberBulkRefreshProcessor extends WorkerHost {
  private readonly JOB_UPDATE_INTERVAL = 5;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly membersService: MembersService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    private readonly memberRefreshJobEventsService: MemberRefreshJobEventsService,
  ) {
    super();
  }

  async process(job: Job<MemberBulkRefreshJobData>): Promise<void> {
    const { jobId, guildId, memberIds } = job.data;

    this.logger.log({
      level: "info",
      message: `Starting bulk refresh job ${jobId} for guild ${guildId} with ${memberIds.length} members`,
    });

    try {
      await this.prisma.db.orm.public.MemberRefreshJob.where((row) =>
        row.id.eq(jobId),
      ).update({ status: "PROCESSING", updatedAt: dateToTemporal(new Date()) });

      await this.memberRefreshJobEventsService.emitJobUpdate(jobId);

      const progress: JobProgress = {
        processedCount: 0,
        refreshedIds: [],
        skippedIds: [],
        failedIds: [],
      };

      const processMember = async (index: number): Promise<void> => {
        if (index >= memberIds.length) {
          return;
        }

        const memberId = memberIds[index];

        try {
          const refreshedMember = await this.membersService.refreshMember({
            discordId: memberId,
            guildId,
            skipTtlCheck: true,
          });

          progress.processedCount++;
          const refreshOutcome = this.recordRefreshOutcome(
            memberId,
            refreshedMember,
            progress,
          );

          if (progress.processedCount % this.JOB_UPDATE_INTERVAL === 0) {
            await this.updateJobProgress(jobId, progress);
          }

          this.logger.log({
            level: "debug",
            message: this.getRefreshOutcomeMessage(
              memberId,
              jobId,
              refreshOutcome,
            ),
          });
        } catch (error) {
          this.logger.log({
            level: "error",
            message: `Failed to refresh member ${memberId} in job ${jobId}`,
            error,
          });

          progress.failedIds.push(memberId);
          await this.prisma.db.runtime().execute(
            this.prisma.db.raw.sql`
              UPDATE "MemberRefreshJob"
              SET "failedMembers" = "failedMembers" + 1
              WHERE "id" = ${jobId}
            `
              .affectedCount()
              .build(),
          );

          if (progress.processedCount % this.JOB_UPDATE_INTERVAL === 0) {
            await this.memberRefreshJobEventsService.emitJobUpdate(jobId);
          }
        }

        await processMember(index + 1);
      };

      await processMember(0);

      await this.prisma.db.orm.public.MemberRefreshJob.where((row) =>
        row.id.eq(jobId),
      ).update({
        status: "COMPLETED",
        processedMembers: progress.processedCount,
        completedAt: dateToTemporal(new Date()),
        updatedAt: dateToTemporal(new Date()),
      });

      await this.memberRefreshJobEventsService.emitJobUpdate(jobId, {
        refreshedIds: progress.refreshedIds,
        skippedIds: progress.skippedIds,
        failedIds: progress.failedIds,
      });

      this.logger.log({
        level: "info",
        message: `Completed bulk refresh job ${jobId} for guild ${guildId}. Refreshed: ${progress.refreshedIds.length}, Skipped: ${progress.skippedIds.length}, Failed: ${progress.failedIds.length}`,
      });
    } catch (error) {
      this.logger.log({
        level: "error",
        message: `Fatal error in bulk refresh job ${jobId}`,
        stack: (error as Error).stack,
      });

      await this.prisma.db.orm.public.MemberRefreshJob.where((row) =>
        row.id.eq(jobId),
      ).update({
        status: "FAILED",
        completedAt: dateToTemporal(new Date()),
        updatedAt: dateToTemporal(new Date()),
      });

      await this.memberRefreshJobEventsService.emitJobUpdate(jobId);
      throw error;
    }
  }

  private async updateJobProgress(
    jobId: number,
    progress: JobProgress,
  ): Promise<void> {
    await this.prisma.db.orm.public.MemberRefreshJob.where((row) =>
      row.id.eq(jobId),
    ).update({
      processedMembers: progress.processedCount,
      updatedAt: dateToTemporal(new Date()),
    });
    await this.memberRefreshJobEventsService.emitJobUpdate(jobId);
  }

  private recordRefreshOutcome(
    memberId: string,
    refreshedMember: Awaited<ReturnType<MembersService["refreshMember"]>>,
    progress: JobProgress,
  ): "refreshed" | "queued" | "missed" {
    if (!refreshedMember) {
      progress.skippedIds.push(memberId);
      return "missed";
    }

    if (refreshedMember.refreshQueued) {
      progress.skippedIds.push(memberId);
      return "queued";
    }

    progress.refreshedIds.push(memberId);
    return "refreshed";
  }

  private getRefreshOutcomeMessage(
    memberId: string,
    jobId: number,
    outcome: "refreshed" | "queued" | "missed",
  ): string {
    switch (outcome) {
      case "queued":
        return `Skipped member ${memberId} in job ${jobId} because refresh is queued`;
      case "missed":
        return `Skipped member ${memberId} in job ${jobId} because no member data was returned`;
      default:
        return `Successfully refreshed member ${memberId} in job ${jobId}`;
    }
  }
}
