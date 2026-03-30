import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { Queue } from "bullmq";
import { eq, and, like } from "drizzle-orm";
import { DrizzleService } from "src/shared/modules/drizzle/drizzle.service";
import {
  notificationJobs,
  type NewNotificationJob,
} from "src/shared/modules/drizzle/schema";
import { NOTIFICATION_EXECUTE_QUEUE } from "src/enums/queue.enum";

interface ScheduleJobParams {
  ruleId: string;
  targetId: string;
  scheduledFor: Date;
  idempotencyKey: string;
  payload: Record<string, unknown>;
}

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly drizzle: DrizzleService,
    @InjectQueue(NOTIFICATION_EXECUTE_QUEUE)
    private readonly notificationQueue: Queue,
  ) {}

  async scheduleJob(params: ScheduleJobParams) {
    const delay = params.scheduledFor.getTime() - Date.now();
    if (delay <= 0) {
      this.logger.warn(
        `Skipping job with past scheduledFor: ${params.idempotencyKey}`,
      );
      return;
    }

    const [job] = await this.drizzle.db
      .insert(notificationJobs)
      .values({
        ruleId: params.ruleId,
        targetId: params.targetId,
        scheduledFor: params.scheduledFor,
        idempotencyKey: params.idempotencyKey,
        payload: params.payload,
      } satisfies NewNotificationJob)
      .onConflictDoUpdate({
        target: [notificationJobs.idempotencyKey],
        set: {
          scheduledFor: params.scheduledFor,
          payload: params.payload,
          status: "pending",
          updatedAt: new Date(),
        },
      })
      .returning();

    const bullJob = await this.notificationQueue.add(
      "execute",
      { jobId: job.id },
      {
        delay,
        jobId: job.id,
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    await this.drizzle.db
      .update(notificationJobs)
      .set({ bullJobId: bullJob.id })
      .where(eq(notificationJobs.id, job.id));

    this.logger.debug(
      `Scheduled job ${job.id} for ${params.scheduledFor.toISOString()}`,
    );

    return job;
  }

  async cancelJobsForNpc(ruleId: string, timerKey: string) {
    const pendingJobs = await this.drizzle.db
      .select()
      .from(notificationJobs)
      .where(
        and(
          eq(notificationJobs.ruleId, ruleId),
          eq(notificationJobs.status, "pending"),
          like(notificationJobs.idempotencyKey, `%npc:${timerKey}%`),
        ),
      );

    for (const job of pendingJobs) {
      if (job.bullJobId) {
        try {
          const bullJob = await this.notificationQueue.getJob(job.bullJobId);
          if (bullJob) {
            await bullJob.remove();
          }
        } catch (error) {
          this.logger.warn(
            `Failed to remove BullMQ job ${job.bullJobId}: ${error}`,
          );
        }
      }
    }

    if (pendingJobs.length) {
      await this.drizzle.db
        .update(notificationJobs)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(
          and(
            eq(notificationJobs.ruleId, ruleId),
            eq(notificationJobs.status, "pending"),
            like(notificationJobs.idempotencyKey, `%npc:${timerKey}%`),
          ),
        );

      this.logger.debug(
        `Cancelled ${pendingJobs.length} jobs for rule=${ruleId} npc=${timerKey}`,
      );
    }
  }

  async markJobProcessing(jobId: string) {
    const [job] = await this.drizzle.db
      .update(notificationJobs)
      .set({ status: "processing", updatedAt: new Date() })
      .where(
        and(
          eq(notificationJobs.id, jobId),
          eq(notificationJobs.status, "pending"),
        ),
      )
      .returning();
    return job;
  }

  async markJobCompleted(jobId: string) {
    await this.drizzle.db
      .update(notificationJobs)
      .set({
        status: "completed",
        processedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(notificationJobs.id, jobId));
  }

  async markJobFailed(jobId: string, error: string) {
    const [job] = await this.drizzle.db
      .update(notificationJobs)
      .set({
        status: "failed",
        lastError: error,
        updatedAt: new Date(),
      })
      .where(eq(notificationJobs.id, jobId))
      .returning();

    return job;
  }

  async incrementAttemptAndFail(jobId: string, error: string) {
    const job = await this.drizzle.db.query.notificationJobs.findFirst({
      where: eq(notificationJobs.id, jobId),
    });

    if (!job) return null;

    const newAttemptCount = job.attemptCount + 1;
    const status = newAttemptCount >= job.maxAttempts ? "failed" : "pending";

    const [updated] = await this.drizzle.db
      .update(notificationJobs)
      .set({
        status,
        lastError: error,
        attemptCount: newAttemptCount,
        updatedAt: new Date(),
      })
      .where(eq(notificationJobs.id, jobId))
      .returning();

    if (status === "pending" && updated) {
      const delay = Math.min(30000 * Math.pow(2, newAttemptCount - 1), 300000);
      await this.notificationQueue.add(
        "execute",
        { jobId },
        {
          delay,
          jobId: `${jobId}-retry-${newAttemptCount}`,
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
    }

    return updated;
  }
}
