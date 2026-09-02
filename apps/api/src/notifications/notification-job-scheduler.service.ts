import { randomUUID } from "node:crypto";
import type { Queue } from "bullmq";
import {
  NotificationJobKind,
  NotificationJobStatus,
  type NotificationOwnerType,
  type NotificationTargetType,
  type NotificationTriggerType,
} from "./notification-enums.js";
import type { JsonValue } from "./notification-database.types.js";
import type { NotificationJobsRepository } from "./notification-jobs.repository.js";
import type { NotificationDispatchJobData } from "./notifications-dispatch.processor.js";

export class NotificationJobSchedulerService {
  constructor(
    private readonly repository: NotificationJobsRepository,
    private readonly queue: Queue<NotificationDispatchJobData>,
  ) {}

  async cancelPendingJobs(filters: {
    jobId?: string;
    ruleId?: number;
    targetId?: number;
    sourceEntityType?: string;
    sourceEntityId?: string;
  }) {
    const jobs = await this.repository.findCancelableJobIds(filters);
    await Promise.all(
      jobs.map(async (job) => {
        const queueJob = await this.queue.getJob(job.id);
        await queueJob?.remove();
      }),
    );
    if (jobs.length > 0) {
      await this.repository.cancelJobs(jobs.map((job) => job.id));
    }
  }

  createNotificationJob(options: {
    notificationRule: {
      id: number;
      ownerType: NotificationOwnerType;
      ownerId: string;
      guildId: string | null;
      triggerType: NotificationTriggerType;
    };
    target: {
      id: number;
      externalId: string;
      targetType: NotificationTargetType;
      active: boolean;
      canSend: boolean;
    };
    jobKind: NotificationJobKind;
    scheduledFor: Date;
    sourceEntityType?: string;
    sourceEntityId?: string;
    sourceEventId?: string;
    payloadSnapshot: JsonValue;
    forceBlocked?: boolean;
  }) {
    const idempotencyKey =
      options.jobKind === NotificationJobKind.SCHEDULED
        ? [
            "scheduled",
            options.notificationRule.id,
            options.target.id,
            options.sourceEntityType ?? "unknown",
            options.sourceEntityId ?? "unknown",
            options.scheduledFor.toISOString(),
          ].join(":")
        : [
            options.jobKind === NotificationJobKind.TEST ? "test" : "instant",
            options.notificationRule.id,
            options.target.id,
            options.sourceEventId ?? randomUUID(),
          ].join(":");

    return this.repository.createJob({
      id: randomUUID(),
      ruleId: options.notificationRule.id,
      targetId: options.target.id,
      ownerType: options.notificationRule.ownerType,
      ownerId: options.notificationRule.ownerId,
      jobKind: options.jobKind,
      scheduledFor: options.scheduledFor,
      status: options.forceBlocked
        ? NotificationJobStatus.BLOCKED
        : NotificationJobStatus.PENDING,
      idempotencyKey,
      sourceEntityType: options.sourceEntityType ?? null,
      sourceEntityId: options.sourceEntityId ?? null,
      sourceEventId: options.sourceEventId ?? null,
      payloadSnapshot: options.payloadSnapshot,
      blockedReason: options.forceBlocked
        ? "Missing Discord bot permissions or target access"
        : null,
    });
  }

  async enqueueNotificationJob(notificationJobId: string, delayMs: number) {
    await this.queue.add(
      notificationJobId,
      { notificationJobId },
      {
        jobId: notificationJobId,
        delay: delayMs,
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
  }
}
