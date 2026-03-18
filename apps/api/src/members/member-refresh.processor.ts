import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Inject, Injectable } from "@nestjs/common";
import type { Job } from "bullmq";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import type { Logger } from "winston";
import { MEMBER_REFRESH_QUEUE } from "./constants/member-refresh-queue.constant";
import {
  MemberRefreshJobData,
  MemberRefreshSchedulerService,
} from "./member-refresh-scheduler.service";
import { MembersService } from "./members.service";

@Injectable()
@Processor(MEMBER_REFRESH_QUEUE, {
  concurrency: 10,
})
export class MemberRefreshProcessor extends WorkerHost {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly membersService: MembersService,
    private readonly scheduler: MemberRefreshSchedulerService,
  ) {
    super();
  }

  async process(job: Job<MemberRefreshJobData>): Promise<void> {
    const lockOwner = `job:${job.id}`;
    const acquiredLock = await this.scheduler.acquireUserRefreshLock(
      job.data.userId,
      lockOwner,
    );

    if (!acquiredLock) {
      throw new Error("MEMBER_REFRESH_LOCKED");
    }

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
        await this.sleep(waitMs);
      }

      await this.membersService.syncMemberFromDiscord({
        discordId: job.data.discordId,
        guildId: job.data.guildId,
        userId: job.data.userId,
      });

      this.logger.log({
        level: "debug",
        message: "Processed queued member refresh job",
        jobId: job.id,
        guildId: job.data.guildId,
        userId: job.data.userId,
        reason: job.data.reason,
      });
    } finally {
      await this.scheduler.releaseUserRefreshLock(job.data.userId, lockOwner);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
