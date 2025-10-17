import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { MembersService } from './members.service';
import { PrismaService } from 'src/db/prisma.service';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { DEFAULT_EXCHANGE_NAME } from 'src/config/rabbitmq.config';
import { RoutingKey } from 'src/enum/routing-key.enum';
import { MEMBER_BULK_REFRESH_QUEUE } from './constants/member-refresh-queue.constant';

interface BulkRefreshJobData {
  jobId: number;
  guildId: string;
  memberIds: string[];
}

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
    private readonly prisma: PrismaService,
    private readonly amqpConnection: AmqpConnection,
  ) {
    super();
  }

  async process(job: Job<BulkRefreshJobData>): Promise<void> {
    const { jobId, guildId, memberIds } = job.data;

    this.logger.log({
      level: 'info',
      message: `Starting bulk refresh job ${jobId} for guild ${guildId} with ${memberIds.length} members`,
    });

    try {
      await this.prisma.memberRefreshJob.update({
        where: { id: jobId },
        data: { status: 'PROCESSING' },
      });

      await this.emitJobUpdate(jobId);

      const progress: JobProgress = {
        processedCount: 0,
        refreshedIds: [],
        skippedIds: [],
        failedIds: [],
      };

      for (const memberId of memberIds) {
        try {
          await this.membersService.refreshMember({
            discordId: memberId,
            guildId,
            skipTtlCheck: true,
          });

          progress.processedCount++;
          progress.refreshedIds.push(memberId);

          if (progress.processedCount % this.JOB_UPDATE_INTERVAL === 0) {
            await this.updateJobProgress(jobId, progress);
          }

          this.logger.log({
            level: 'debug',
            message: `Successfully refreshed member ${memberId} in job ${jobId}`,
          });
        } catch (error) {
          this.logger.log({
            level: 'error',
            message: `Failed to refresh member ${memberId} in job ${jobId}`,
            error,
          });

          progress.failedIds.push(memberId);
          await this.prisma.memberRefreshJob.update({
            where: { id: jobId },
            data: { failedMembers: { increment: 1 } },
          });

          if (progress.processedCount % this.JOB_UPDATE_INTERVAL === 0) {
            await this.emitJobUpdate(jobId);
          }
        }
      }

      await this.prisma.memberRefreshJob.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          processedMembers: progress.processedCount,
          completedAt: new Date(),
        },
      });

      await this.emitJobUpdateWithDetails(jobId, progress);

      this.logger.log({
        level: 'info',
        message: `Completed bulk refresh job ${jobId} for guild ${guildId}. Refreshed: ${progress.refreshedIds.length}, Failed: ${progress.failedIds.length}`,
      });
    } catch (error) {
      this.logger.log({
        level: 'error',
        message: `Fatal error in bulk refresh job ${jobId}`,
        stack: (error as Error).stack,
      });

      await this.prisma.memberRefreshJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
        },
      });

      await this.emitJobUpdate(jobId);
      throw error;
    }
  }

  private async updateJobProgress(
    jobId: number,
    progress: JobProgress,
  ): Promise<void> {
    await this.prisma.memberRefreshJob.update({
      where: { id: jobId },
      data: { processedMembers: progress.processedCount },
    });
    await this.emitJobUpdate(jobId);
  }

  private async emitJobUpdate(jobId: number): Promise<void> {
    try {
      const job = await this.prisma.memberRefreshJob.findUnique({
        where: { id: jobId },
      });

      if (!job) {
        this.logger.log({
          level: 'warn',
          message: `Job ${jobId} not found when emitting update`,
        });
        return;
      }

      await this.amqpConnection.publish(
        DEFAULT_EXCHANGE_NAME,
        RoutingKey.GUILDS_MEMBERS_REFRESH_JOB_UPDATE,
        {
          jobId: job.id,
          guildId: job.guildId,
          status: job.status,
          totalMembers: job.totalMembers,
          processedMembers: job.processedMembers,
          failedMembers: job.failedMembers,
          completedAt: job.completedAt,
        },
      );

      this.logger.log({
        level: 'debug',
        message: `Emitted job update for job ${jobId}`,
      });
    } catch (error) {
      this.logger.log({
        level: 'error',
        message: `Failed to emit job update for job ${jobId}`,
        stack: (error as Error).stack,
      });
    }
  }

  private async emitJobUpdateWithDetails(
    jobId: number,
    progress: JobProgress,
  ): Promise<void> {
    try {
      const job = await this.prisma.memberRefreshJob.findUnique({
        where: { id: jobId },
      });

      if (!job) {
        this.logger.log({
          level: 'warn',
          message: `Job ${jobId} not found when emitting detailed update`,
        });
        return;
      }

      await this.amqpConnection.publish(
        DEFAULT_EXCHANGE_NAME,
        RoutingKey.GUILDS_MEMBERS_REFRESH_JOB_UPDATE,
        {
          jobId: job.id,
          guildId: job.guildId,
          status: job.status,
          totalMembers: job.totalMembers,
          processedMembers: job.processedMembers,
          failedMembers: job.failedMembers,
          completedAt: job.completedAt,
          refreshedIds: progress.refreshedIds,
          skippedIds: progress.skippedIds,
          failedIds: progress.failedIds,
        },
      );

      this.logger.log({
        level: 'debug',
        message: `Emitted detailed job update for job ${jobId}`,
      });
    } catch (error) {
      this.logger.log({
        level: 'error',
        message: `Failed to emit detailed job update for job ${jobId}`,
        stack: (error as Error).stack,
      });
    }
  }
}
