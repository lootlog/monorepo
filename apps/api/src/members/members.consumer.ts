import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe, AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { MembersService } from 'src/members/members.service';
import { PrismaService } from 'src/db/prisma.service';
import { DEFAULT_EXCHANGE_NAME } from 'src/config/rabbitmq.config';
import { RoutingKey } from 'src/enum/routing-key.enum';
import { Queue } from 'src/enum/queue.enum';

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
  private readonly logger = new Logger(MembersConsumer.name);

  constructor(
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

    this.logger.log(
      `Starting bulk refresh job ${jobId} for guild ${guildId} with ${memberIds.length} members`,
    );

    try {
      await this.prisma.memberRefreshJob.update({
        where: { id: jobId },
        data: { status: 'PROCESSING' },
      });

      await this.emitJobUpdate(jobId);

      let processedCount = 0;

      for (const memberId of memberIds) {
        try {
          await this.sleep(200);

          await this.membersService.refreshMember({
            discordId: memberId,
            guildId,
          });

          await this.prisma.memberRefreshJob.update({
            where: { id: jobId },
            data: { processedMembers: { increment: 1 } },
          });

          processedCount++;

          if (processedCount % 5 === 0) {
            await this.emitJobUpdate(jobId);
          }

          this.logger.debug(
            `Successfully refreshed member ${memberId} in job ${jobId}`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to refresh member ${memberId} in job ${jobId}`,
            error,
          );

          await this.prisma.memberRefreshJob.update({
            where: { id: jobId },
            data: { failedMembers: { increment: 1 } },
          });

          await this.emitJobUpdate(jobId);
        }
      }

      await this.prisma.memberRefreshJob.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      await this.emitJobUpdate(jobId);

      this.logger.log(`Completed bulk refresh job ${jobId} for guild ${guildId}`);
    } catch (error) {
      this.logger.error(
        `Fatal error in bulk refresh job ${jobId}`,
        (error as Error).stack,
      );

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

    this.logger.debug(
      `Processing background refresh for member ${discordId} in guild ${guildId}`,
    );

    try {
      await this.membersService.getGuildMemberById({
        discordId,
        guildId,
        userId,
        refresh: false,
        standalone: false,
      });

      this.logger.debug(
        `Successfully refreshed member ${discordId} in guild ${guildId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to refresh member ${discordId} in guild ${guildId}`,
        (error as Error).stack,
      );
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
        this.logger.warn(`Job ${jobId} not found when emitting update`);
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

      this.logger.debug(`Emitted job update for job ${jobId}`);
    } catch (error) {
      this.logger.error(
        `Failed to emit job update for job ${jobId}`,
        (error as Error).stack,
      );
    }
  }
}
