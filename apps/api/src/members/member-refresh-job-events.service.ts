import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import type { Logger } from "winston";
import { DEFAULT_EXCHANGE_NAME } from "src/config/rabbitmq.config";
import { PrismaService } from "src/db/prisma.service";
import { RoutingKey } from "src/enum/routing-key.enum";

export type MemberRefreshJobUpdateDetails = {
  refreshedIds?: string[];
  skippedIds?: string[];
  failedIds?: string[];
};

@Injectable()
export class MemberRefreshJobEventsService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly prisma: PrismaService,
    private readonly amqpConnection: AmqpConnection,
  ) {}

  async emitJobUpdate(
    jobId: number,
    details: MemberRefreshJobUpdateDetails = {},
  ): Promise<void> {
    try {
      const job = await this.prisma.memberRefreshJob.findUnique({
        where: { id: jobId },
      });

      if (!job) {
        this.logger.log({
          level: "warn",
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
          ...details,
        },
      );

      this.logger.log({
        level: "debug",
        message: `Emitted job update for job ${jobId}`,
      });
    } catch (error) {
      this.logger.log({
        level: "error",
        message: `Failed to emit job update for job ${jobId}`,
        stack: (error as Error).stack,
      });
    }
  }
}
