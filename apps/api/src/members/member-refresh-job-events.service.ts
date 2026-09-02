import type { AmqpPublisher } from "#src/rabbitmq/amqp-publisher";

import type { ApplicationLogger as Logger } from "#src/shared/logging/application-logger";
import { DEFAULT_EXCHANGE_NAME } from "#src/config/rabbitmq.config";
import { RoutingKey } from "#src/enum/routing-key.enum";
import { MemberRefreshJobRepository } from "./member-refresh-job.repository.js";

export type MemberRefreshJobUpdateDetails = {
  refreshedIds?: string[];
  skippedIds?: string[];
  failedIds?: string[];
};

export class MemberRefreshJobEventsService {
  constructor(
    private readonly logger: Logger,
    private readonly refreshJobs: MemberRefreshJobRepository,
    private readonly amqpConnection: AmqpPublisher,
  ) {}

  async emitJobUpdate(
    jobId: number,
    details: MemberRefreshJobUpdateDetails = {},
  ): Promise<void> {
    try {
      const job = await this.refreshJobs.findById(jobId);

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
