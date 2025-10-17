import { Inject, Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue as BullQueue } from 'bullmq';
import { RabbitSubscribe, AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { MembersService } from 'src/members/members.service';
import { PrismaService } from 'src/db/prisma.service';
import { DEFAULT_EXCHANGE_NAME } from 'src/config/rabbitmq.config';
import { RoutingKey } from 'src/enum/routing-key.enum';
import { Queue } from 'src/enum/queue.enum';
import { MEMBER_BULK_REFRESH_QUEUE } from './constants/member-refresh-queue.constant';

interface BulkRefreshPayload {
  jobId: number;
  guildId: string;
  memberIds: string[];
}

interface MemberRefreshPayload {
  discordId: string;
  guildId: string;
  userId: string;
}

@Injectable()
export class MembersConsumer {
  private readonly MEMBER_REFRESH_DELAY_MS = 200;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    @InjectQueue(MEMBER_BULK_REFRESH_QUEUE)
    private readonly bulkRefreshQueue: BullQueue,
    private readonly membersService: MembersService,
    private readonly prisma: PrismaService,
    private readonly amqpConnection: AmqpConnection,
  ) {}

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.GUILDS_MEMBERS_BULK_REFRESH,
    queue: Queue.GUILDS_MEMBERS_BULK_REFRESH,
  })
  async handleBulkRefresh(payload: BulkRefreshPayload) {
    const { jobId, guildId, memberIds } = payload;

    this.logger.log({
      level: 'info',
      message: `Queueing bulk refresh job ${jobId} for guild ${guildId} with ${memberIds.length} members to BullMQ`,
    });

    try {
      await this.bulkRefreshQueue.add(
        'bulk-refresh',
        {
          jobId,
          guildId,
          memberIds,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      );

      this.logger.log({
        level: 'info',
        message: `Successfully queued bulk refresh job ${jobId} to BullMQ`,
      });
    } catch (error) {
      this.logger.log({
        level: 'error',
        message: `Failed to queue bulk refresh job ${jobId} to BullMQ`,
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
    }
  }

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.GUILDS_MEMBERS_REFRESH,
    queue: Queue.GUILDS_MEMBERS_REFRESH,
  })
  async handleMemberRefresh(payload: MemberRefreshPayload) {
    const { discordId, guildId, userId } = payload;

    this.logger.log({
      level: 'debug',
      message: `Processing background refresh for member ${discordId} in guild ${guildId}`,
    });

    try {
      await this.sleep(this.MEMBER_REFRESH_DELAY_MS);

      await this.membersService.getGuildMemberById({
        discordId,
        guildId,
        userId,
        refresh: false,
        standalone: false,
      });

      this.logger.log({
        level: 'debug',
        message: `Successfully refreshed member ${discordId} in guild ${guildId}`,
      });
    } catch (error) {
      this.logger.log({
        level: 'error',
        message: `Failed to refresh member ${discordId} in guild ${guildId}`,
        stack: (error as Error).stack,
      });
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async emitJobUpdate(jobId: number) {
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
}
