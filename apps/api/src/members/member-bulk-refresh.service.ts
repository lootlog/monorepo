import { InjectQueue } from "@nestjs/bullmq";
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Queue as BullQueue } from "bullmq";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import type { Logger } from "winston";
import { serviceConfig } from "#src/config/service.config";
import { RuntimeEnvironment } from "@lootlog/schema/runtime-environment";
import { getAdminBulkRefreshRateLimit } from "./constants/member-cache.constant.js";
import { MEMBER_BULK_REFRESH_QUEUE } from "./constants/member-refresh-queue.constant.js";
import { ErrorKey } from "./enum/error-key.enum.js";
import { MemberReadService } from "./member-read.service.js";
import { MemberRefreshJobEventsService } from "./member-refresh-job-events.service.js";
import type {
  MemberBulkRefreshJobData,
  RefreshJobWithCooldown,
} from "./member.types.js";
import { MemberRefreshJobRepository } from "./member-refresh-job.repository.js";

@Injectable()
export class MemberBulkRefreshService {
  private readonly env: RuntimeEnvironment;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    @InjectQueue(MEMBER_BULK_REFRESH_QUEUE)
    private readonly bulkRefreshQueue: BullQueue<MemberBulkRefreshJobData>,
    private readonly refreshJobs: MemberRefreshJobRepository,
    private readonly memberReadService: MemberReadService,
    private readonly memberRefreshJobEventsService: MemberRefreshJobEventsService,
  ) {
    this.env = serviceConfig.env;
  }

  async createBulkRefreshJob(
    guildId: string,
    requestedBy: string,
  ): Promise<RefreshJobWithCooldown> {
    const rateLimit = getAdminBulkRefreshRateLimit(this.env);
    const recentJob = await this.refreshJobs.findRecent(
      guildId,
      new Date(Date.now() - rateLimit),
    );

    if (recentJob) {
      throw new BadRequestException({
        message: ErrorKey.BULK_REFRESH_RATE_LIMIT_ACTIVE,
        nextAvailableAt: new Date(recentJob.createdAt.getTime() + rateLimit),
      });
    }

    const members = await this.memberReadService.getGuildMembers(guildId);
    const job = await this.refreshJobs.create(
      guildId,
      requestedBy,
      members.length,
    );

    try {
      await this.bulkRefreshQueue.add(
        "bulk-refresh",
        {
          jobId: job.id,
          guildId,
          memberIds: members.map((member) => member.userId),
        },
        {
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 2000,
          },
          jobId: `member-bulk-refresh-${job.id}`,
        },
      );
    } catch (error) {
      this.logger.log({
        level: "error",
        message: `Failed to queue bulk refresh job ${job.id} to BullMQ`,
        stack: (error as Error).stack,
      });

      await this.refreshJobs.update(job.id, {
        status: "FAILED",
        completedAt: new Date(),
      });
      await this.memberRefreshJobEventsService.emitJobUpdate(job.id);
      throw error;
    }

    return this.withRefreshJobCooldown(job);
  }

  async getLatestRefreshJob(
    guildId: string,
  ): Promise<RefreshJobWithCooldown | null> {
    const job = await this.refreshJobs.findLatest(guildId);

    return job ? this.withRefreshJobCooldown(job) : null;
  }

  async getRefreshJobStatus(options: {
    guildId: string;
    jobId: number;
  }): Promise<RefreshJobWithCooldown> {
    const job = await this.refreshJobs.findById(options.jobId, options.guildId);

    if (!job) {
      throw new NotFoundException({
        message: ErrorKey.REFRESH_JOB_NOT_FOUND,
      });
    }

    return this.withRefreshJobCooldown(job);
  }

  private withRefreshJobCooldown(
    job: Awaited<ReturnType<MemberRefreshJobRepository["findById"]>> & {},
  ): RefreshJobWithCooldown {
    return {
      ...job,
      nextAvailableAt: new Date(
        job.createdAt.getTime() + getAdminBulkRefreshRateLimit(this.env),
      ),
    };
  }
}
