import { and } from "@prisma/orm-family-sql/orm-client";
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
import { PrismaService } from "#src/db/prisma.service";
import { temporalToDate } from "#src/db/temporal";
import { RuntimeEnvironment } from "@lootlog/types";
import { getAdminBulkRefreshRateLimit } from "./constants/member-cache.constant.js";
import { MEMBER_BULK_REFRESH_QUEUE } from "./constants/member-refresh-queue.constant.js";
import { ErrorKey } from "./enum/error-key.enum.js";
import { MemberReadService } from "./member-read.service.js";
import { MemberRefreshJobEventsService } from "./member-refresh-job-events.service.js";
import type {
  MemberBulkRefreshJobData,
  RefreshJobWithCooldown,
} from "./member.types.js";

@Injectable()
export class MemberBulkRefreshService {
  private readonly env: RuntimeEnvironment;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    @InjectQueue(MEMBER_BULK_REFRESH_QUEUE)
    private readonly bulkRefreshQueue: BullQueue<MemberBulkRefreshJobData>,
    @Inject(PrismaService) private readonly prisma: PrismaService,
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
    const recentJob = await this.prisma.db.orm.public.MemberRefreshJob.where(
      (row) => row.guildId.eq(guildId),
    )
      .where((job) => job.createdAt.gte(new Date(Date.now() - rateLimit)))
      .orderBy((job) => job.createdAt.desc())
      .first();

    if (recentJob) {
      throw new BadRequestException({
        message: ErrorKey.BULK_REFRESH_RATE_LIMIT_ACTIVE,
        nextAvailableAt: new Date(
          temporalToDate(recentJob.createdAt).getTime() + rateLimit,
        ),
      });
    }

    const members = await this.memberReadService.getGuildMembers(guildId);
    const job = await this.prisma.db.orm.public.MemberRefreshJob.create({
      guildId,
      requestedBy,
      status: "PENDING",
      totalMembers: members.length,
      updatedAt: new Date(),
    });

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

      await this.prisma.db.orm.public.MemberRefreshJob.where((row) =>
        row.id.eq(job.id),
      ).update({
        status: "FAILED",
        completedAt: new Date(),
        updatedAt: new Date(),
      });
      await this.memberRefreshJobEventsService.emitJobUpdate(job.id);
      throw error;
    }

    return this.withRefreshJobCooldown(job);
  }

  async getLatestRefreshJob(
    guildId: string,
  ): Promise<RefreshJobWithCooldown | null> {
    const job = await this.prisma.db.orm.public.MemberRefreshJob.where((row) =>
      row.guildId.eq(guildId),
    )
      .orderBy((refreshJob) => refreshJob.createdAt.desc())
      .first();

    return job ? this.withRefreshJobCooldown(job) : null;
  }

  async getRefreshJobStatus(options: {
    guildId: string;
    jobId: number;
  }): Promise<RefreshJobWithCooldown> {
    const job = await this.prisma.db.orm.public.MemberRefreshJob.where((row) =>
      and(row.id.eq(options.jobId), row.guildId.eq(options.guildId)),
    ).first();

    if (!job) {
      throw new NotFoundException({
        message: ErrorKey.REFRESH_JOB_NOT_FOUND,
      });
    }

    return this.withRefreshJobCooldown(job);
  }

  private withRefreshJobCooldown(job: {
    id: number;
    guildId: string;
    requestedBy: string;
    status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
    totalMembers: number;
    processedMembers: number;
    failedMembers: number;
    createdAt: Date | { toString(): string };
    updatedAt: Date | { toString(): string };
    completedAt: Date | { toString(): string } | null;
  }): RefreshJobWithCooldown {
    const createdAt = temporalToDate(job.createdAt);
    return {
      ...job,
      createdAt,
      updatedAt: temporalToDate(job.updatedAt),
      completedAt:
        job.completedAt === null ? null : temporalToDate(job.completedAt),
      nextAvailableAt: new Date(
        createdAt.getTime() + getAdminBulkRefreshRateLimit(this.env),
      ),
    };
  }
}
