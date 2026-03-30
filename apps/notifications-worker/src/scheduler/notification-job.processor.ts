import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import type { Job } from "bullmq";
import { eq } from "drizzle-orm";
import { DEFAULT_EXCHANGE_NAME } from "src/config/rabbitmq.config";
import { RoutingKey } from "src/enums/routing-key.enum";
import { NOTIFICATION_EXECUTE_QUEUE } from "src/enums/queue.enum";
import { DrizzleService } from "src/shared/modules/drizzle/drizzle.service";
import { notificationJobs } from "src/shared/modules/drizzle/schema";
import { SchedulerService } from "./scheduler.service";

@Processor(NOTIFICATION_EXECUTE_QUEUE)
export class NotificationJobProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationJobProcessor.name);

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly amqpConnection: AmqpConnection,
    private readonly schedulerService: SchedulerService,
  ) {
    super();
  }

  async process(bullJob: Job<{ jobId: string }>) {
    const { jobId } = bullJob.data;
    this.logger.debug(`Processing notification job ${jobId}`);

    const notificationJob =
      await this.drizzle.db.query.notificationJobs.findFirst({
        where: eq(notificationJobs.id, jobId),
        with: {
          rule: true,
          target: true,
        },
      });

    if (!notificationJob) {
      this.logger.warn(`Job ${jobId} not found in database`);
      return;
    }

    if (notificationJob.status !== "pending") {
      this.logger.debug(
        `Job ${jobId} is ${notificationJob.status}, skipping`,
      );
      return;
    }

    const job = await this.schedulerService.markJobProcessing(jobId);
    if (!job) {
      this.logger.debug(`Job ${jobId} could not be marked as processing`);
      return;
    }

    try {
      await this.amqpConnection.publish(
        DEFAULT_EXCHANGE_NAME,
        RoutingKey.NOTIFICATIONS_DISCORD_SEND,
        {
          jobId,
          idempotencyKey: notificationJob.idempotencyKey,
          targetType: notificationJob.target?.targetType,
          externalId: notificationJob.target?.externalId,
          payload: notificationJob.payload,
        },
      );

      this.logger.debug(`Job ${jobId} dispatched to Discord delivery`);
    } catch (error) {
      this.logger.error(`Failed to dispatch job ${jobId}: ${error}`);
      await this.schedulerService.incrementAttemptAndFail(
        jobId,
        String(error),
      );
      throw error;
    }
  }
}
