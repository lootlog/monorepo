import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Inject, Injectable } from "@nestjs/common";
import type { Job } from "bullmq";
import { APPLICATION_LOGGER } from "#src/shared/logging/logger-token";
import type { Logger } from "winston";
import { NOTIFICATIONS_DISPATCH_QUEUE } from "#src/notifications/constants/notifications-dispatch-queue.constant";
import { NotificationJobService } from "#src/notifications/notification-job.service";

export interface NotificationDispatchJobData {
  notificationJobId: string;
}

@Injectable()
@Processor(NOTIFICATIONS_DISPATCH_QUEUE)
export class NotificationsDispatchProcessor extends WorkerHost {
  constructor(
    private readonly jobService: NotificationJobService,
    @Inject(APPLICATION_LOGGER) private readonly logger: Logger,
  ) {
    super();
  }

  async process(job: Job<NotificationDispatchJobData>) {
    await this.jobService.dispatchNotificationJob(job.data.notificationJobId);

    this.logger.log({
      level: "info",
      message: "Notification dispatch job processed",
      notificationJobId: job.data.notificationJobId,
      queueJobId: job.id,
    });
  }
}
