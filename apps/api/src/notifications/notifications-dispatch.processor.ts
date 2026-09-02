import type { Job } from "bullmq";
import type { ApplicationLogger as Logger } from "#src/shared/logging/application-logger";
import { NOTIFICATIONS_DISPATCH_QUEUE } from "#src/notifications/constants/notifications-dispatch-queue.constant";
import { NotificationJobService } from "#src/notifications/notification-job.service";

export interface NotificationDispatchJobData {
  notificationJobId: string;
}

export class NotificationsDispatchProcessor {
  constructor(
    private readonly jobService: NotificationJobService,
    private readonly logger: Logger,
  ) {}

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
