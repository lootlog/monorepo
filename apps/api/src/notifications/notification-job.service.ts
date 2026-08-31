import { and } from "@prisma/orm-family-sql/orm-client";
import { randomUUID } from "node:crypto";
import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { InjectQueue } from "@nestjs/bullmq";
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import type { DiscordNotificationDeliveryResultEvent } from "@lootlog/types";
import type { Queue } from "bullmq";
import {
  NotificationJobKind as DbNotificationJobKind,
  NotificationJobStatus as DbNotificationJobStatus,
  NotificationOwnerType as DbNotificationOwnerType,
  NotificationProvider as DbNotificationProvider,
  NotificationScheduleAnchor as DbNotificationScheduleAnchor,
  NotificationScheduleIntervalType as DbNotificationScheduleIntervalType,
  NotificationScheduleStrategy as DbNotificationScheduleStrategy,
  NotificationTriggerType as DbNotificationTriggerType,
  type NotificationTargetType as DbNotificationTargetType,
  type InputJsonValue,
  type JsonObject,
  type JsonValue,
} from "#src/db/domain";
import { DEFAULT_EXCHANGE_NAME } from "#src/config/rabbitmq.config";
import { PrismaService } from "#src/db/prisma.service";
import { isUniqueConstraintError } from "#src/db/database-errors";
import { RoutingKey } from "#src/enum/routing-key.enum";
import { GuildsService } from "#src/guilds/guilds.service";
import { GUILD_NOTIFICATION_TIMEZONE } from "#src/notifications/constants/notification-schedule-timezone.constant";
import { NOTIFICATIONS_DISPATCH_QUEUE } from "#src/notifications/constants/notifications-dispatch-queue.constant";
import {
  NOTIFICATIONS_HISTORY_RESPONSE_LIMIT,
  NOTIFICATIONS_HISTORY_RETENTION_LIMIT,
} from "#src/notifications/constants/notifications-history.constant";
import { NotificationContentService } from "#src/notifications/notification-content.service";
import {
  NotificationFiltersResponseDto,
  NotificationJobPayloadSnapshotResponseDto,
} from "#src/notifications/dto/notification-response.dto";
import { NotificationMatchingService } from "#src/notifications/notification-matching.service";
import { Error } from "#src/notifications/enum/error.enum";
import type { NotificationDispatchJobData } from "#src/notifications/notifications-dispatch.processor";
import { calculateNextOccurrenceInTimeZone } from "#src/notifications/utils/notification-schedule-time.util";

type OwnerContext = {
  ownerType: DbNotificationOwnerType;
  ownerId: string;
};

type TimerUpdatedEvent = {
  guildId: string;
  world: string;
  npcId: number;
  timerKey: string;
  minSpawnTime: string | Date;
  maxSpawnTime: string | Date;
  npc?: {
    name?: string;
  } | null;
};

const FINAL_JOB_STATUSES: readonly DbNotificationJobStatus[] = [
  DbNotificationJobStatus.SENT,
  DbNotificationJobStatus.FAILED,
  DbNotificationJobStatus.CANCELED,
];

@Injectable()
export class NotificationJobService {
  private readonly logger = new Logger(NotificationJobService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly guildsService: GuildsService,
    private readonly contentService: NotificationContentService,
    private readonly matchingService: NotificationMatchingService,
    private readonly amqpConnection: AmqpConnection,
    @InjectQueue(NOTIFICATIONS_DISPATCH_QUEUE)
    private readonly notificationsQueue: Queue<NotificationDispatchJobData>,
  ) {}

  listGuildJobs(guildId: string) {
    return this.getJobsForOwner({
      ownerType: DbNotificationOwnerType.GUILD,
      ownerId: guildId,
    }).then(({ pending, history }) => ({
      pending: pending.map((job) => this.mapJobResponse(job)),
      history: history.map((job) => this.mapJobResponse(job)),
    }));
  }

  async cancelGuildJob(guildId: string, jobId: string) {
    await this.ensureGuildJob(guildId, jobId);
    await this.cancelPendingJobs({ jobId });
    return { success: true };
  }

  listUserJobs(discordId: string) {
    return this.getJobsForOwner({
      ownerType: DbNotificationOwnerType.USER,
      ownerId: discordId,
    }).then(({ pending, history }) => ({
      pending: pending.map((job) => this.mapJobResponse(job)),
      history: history.map((job) => this.mapJobResponse(job)),
    }));
  }

  async cancelPendingJobs(filters: {
    jobId?: string;
    ruleId?: number;
    targetId?: number;
    sourceEntityType?: string;
    sourceEntityId?: string;
  }) {
    const { jobId, ...remainingFilters } = filters;

    let jobsQuery = this.prisma.db.orm.public.NotificationJob.where((row) =>
      row.status.in([
        DbNotificationJobStatus.PENDING,
        DbNotificationJobStatus.BLOCKED,
      ]),
    );
    for (const [field, value] of Object.entries(remainingFilters)) {
      if (value !== undefined) {
        jobsQuery = jobsQuery.where((row) => row[field].eq(value));
      }
    }
    if (jobId) {
      jobsQuery = jobsQuery.where((row) => row.id.eq(jobId));
    }
    const jobs = await jobsQuery.select("id").all();

    await Promise.all(
      jobs.map(async (job) => {
        const queueJob = await this.notificationsQueue.getJob(job.id);
        await queueJob?.remove();
      }),
    );

    if (jobs.length === 0) {
      return;
    }

    await this.prisma.db.orm.public.NotificationJob.where((row) =>
      and(
        row.id.in(jobs.map((job) => job.id)),
        row.status.in([
          DbNotificationJobStatus.PENDING,
          DbNotificationJobStatus.BLOCKED,
        ]),
      ),
    ).updateAndCount({
      status: DbNotificationJobStatus.CANCELED,
      processedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  async createNotificationJob(options: {
    notificationRule: {
      id: number;
      ownerType: DbNotificationOwnerType;
      ownerId: string;
      guildId: string | null;
      triggerType: DbNotificationTriggerType;
    };
    target: {
      id: number;
      externalId: string;
      targetType: DbNotificationTargetType;
      active: boolean;
      canSend: boolean;
    };
    jobKind: DbNotificationJobKind;
    scheduledFor: Date;
    sourceEntityType?: string;
    sourceEntityId?: string;
    sourceEventId?: string;
    payloadSnapshot: InputJsonValue;
    forceBlocked?: boolean;
  }) {
    const idempotencyKey =
      options.jobKind === DbNotificationJobKind.SCHEDULED
        ? [
            "scheduled",
            options.notificationRule.id,
            options.target.id,
            options.sourceEntityType ?? "unknown",
            options.sourceEntityId ?? "unknown",
            options.scheduledFor.toISOString(),
          ].join(":")
        : [
            options.jobKind === DbNotificationJobKind.TEST ? "test" : "instant",
            options.notificationRule.id,
            options.target.id,
            options.sourceEventId ?? randomUUID(),
          ].join(":");

    try {
      return await this.prisma.db.orm.public.NotificationJob.create({
        id: randomUUID(),
        ruleId: options.notificationRule.id,
        targetId: options.target.id,
        ownerType: options.notificationRule.ownerType,
        ownerId: options.notificationRule.ownerId,
        jobKind: options.jobKind,
        scheduledFor: options.scheduledFor,
        status: options.forceBlocked
          ? DbNotificationJobStatus.BLOCKED
          : DbNotificationJobStatus.PENDING,
        idempotencyKey,
        sourceEntityType: options.sourceEntityType ?? null,
        sourceEntityId: options.sourceEntityId ?? null,
        sourceEventId: options.sourceEventId ?? null,
        payloadSnapshot: options.payloadSnapshot,
        blockedReason: options.forceBlocked
          ? "Missing Discord bot permissions or target access"
          : null,
        updatedAt: new Date(),
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        const existingJob =
          await this.prisma.db.orm.public.NotificationJob.where((row) =>
            row.idempotencyKey.eq(idempotencyKey),
          ).first();

        if (existingJob?.status !== DbNotificationJobStatus.CANCELED) {
          return null;
        }

        return this.prisma.db.transaction(async (tx) => {
          await tx.orm.public.NotificationJob.where((row) =>
            row.id.eq(existingJob.id),
          ).update({
            idempotencyKey: `${idempotencyKey}:canceled:${randomUUID()}`,
            updatedAt: new Date(),
          });

          return tx.orm.public.NotificationJob.create({
            id: randomUUID(),
            ruleId: options.notificationRule.id,
            targetId: options.target.id,
            ownerType: options.notificationRule.ownerType,
            ownerId: options.notificationRule.ownerId,
            jobKind: options.jobKind,
            scheduledFor: options.scheduledFor,
            status: options.forceBlocked
              ? DbNotificationJobStatus.BLOCKED
              : DbNotificationJobStatus.PENDING,
            idempotencyKey,
            sourceEntityType: options.sourceEntityType ?? null,
            sourceEntityId: options.sourceEntityId ?? null,
            sourceEventId: options.sourceEventId ?? null,
            payloadSnapshot: options.payloadSnapshot,
            blockedReason: options.forceBlocked
              ? "Missing Discord bot permissions or target access"
              : null,
            updatedAt: new Date(),
          });
        });
      }

      throw error;
    }
  }

  async enqueueNotificationJob(notificationJobId: string, delayMs: number) {
    await this.notificationsQueue.add(
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

  async dispatchNotificationJob(notificationJobId: string) {
    const notificationJob =
      await this.prisma.db.orm.public.NotificationJob.where((row) =>
        row.id.eq(notificationJobId),
      )
        .include("rule")
        .include("target")
        .first();

    if (!notificationJob) {
      return;
    }

    const targetBlockedReason = this.getNotificationTargetBlockedReason(
      notificationJob.target,
    );

    if (targetBlockedReason) {
      await this.prisma.db.orm.public.NotificationJob.where((row) =>
        row.id.eq(notificationJob.id),
      ).update({
        status: DbNotificationJobStatus.BLOCKED,
        blockedReason: targetBlockedReason,
        lastError: targetBlockedReason,
        updatedAt: new Date(),
      });
      return;
    }

    if (
      notificationJob.ownerType === DbNotificationOwnerType.GUILD &&
      !(await this.guildsService.hasRequiredGuildPermissions(
        notificationJob.ownerId,
      ))
    ) {
      await this.prisma.db.orm.public.NotificationJob.where((row) =>
        row.id.eq(notificationJob.id),
      ).update({
        status: DbNotificationJobStatus.BLOCKED,
        blockedReason: "Missing Discord bot permissions",
        lastError: "Missing Discord bot permissions",
        updatedAt: new Date(),
      });
      return;
    }

    const { affectedRows: updateResult } = await this.prisma.db
      .runtime()
      .execute(
        this.prisma.db.raw.sql`
        UPDATE "NotificationJob"
        SET
          "status" = ${DbNotificationJobStatus.PROCESSING},
          "blockedReason" = NULL,
          "attemptCount" = "attemptCount" + 1,
          "updatedAt" = NOW()
        WHERE "id" = ${notificationJob.id}
          AND "status" IN (
            ${DbNotificationJobStatus.PENDING},
            ${DbNotificationJobStatus.BLOCKED}
          )
      `
          .affectedCount()
          .build(),
      );

    if (updateResult === 0) {
      return;
    }

    const payload = notificationJob.payloadSnapshot as
      | JsonObject
      | null
      | undefined;

    try {
      await this.amqpConnection.publish(
        DEFAULT_EXCHANGE_NAME,
        RoutingKey.NOTIFICATIONS_DISCORD_SEND,
        {
          notificationJobId: notificationJob.id,
          provider: DbNotificationProvider.DISCORD,
          ownerType: notificationJob.ownerType,
          ownerId: notificationJob.ownerId,
          guildId: notificationJob.rule.guildId,
          content:
            typeof payload?.content === "string" ? payload.content : undefined,
          title:
            typeof payload?.title === "string"
              ? payload.title
              : "Powiadomienie",
          message:
            typeof payload?.message === "string"
              ? payload.message
              : "Masz nowe powiadomienie",
          allowedMentions: this.contentService.parseAllowedMentions(
            payload?.allowedMentions,
          ),
          metadata:
            payload && typeof payload === "object" ? payload : undefined,
          target: {
            targetId: String(notificationJob.target.id),
            externalId: notificationJob.target.externalId,
            targetType: notificationJob.target.targetType,
          },
        },
      );
    } catch (caughtError) {
      const errorMessage =
        caughtError &&
        typeof caughtError === "object" &&
        "message" in caughtError
          ? String(caughtError.message)
          : String(caughtError);

      this.logger.error(
        `AMQP publish failed for job ${notificationJob.id}: ${errorMessage}`,
      );

      await this.prisma.db.orm.public.NotificationJob.where((row) =>
        row.id.eq(notificationJob.id),
      ).update({
        status: DbNotificationJobStatus.PENDING,
        lastError: `AMQP publish failed: ${errorMessage}`,
        updatedAt: new Date(),
      });

      const retryDelay = Math.min(
        60_000,
        notificationJob.attemptCount * 15_000,
      );
      await this.enqueueNotificationJob(notificationJob.id, retryDelay);
    }
  }

  async handleDeliveryResult(event: DiscordNotificationDeliveryResultEvent) {
    const notificationJob =
      await this.prisma.db.orm.public.NotificationJob.where((row) =>
        row.id.eq(event.notificationJobId),
      ).first();

    if (!notificationJob) {
      return;
    }

    if (FINAL_JOB_STATUSES.includes(notificationJob.status)) {
      return;
    }

    if (event.success) {
      await this.prisma.db.transaction(async (tx) => {
        await tx.orm.public.NotificationJob.where((row) =>
          row.id.eq(notificationJob.id),
        ).update({
          status: DbNotificationJobStatus.SENT,
          processedAt: new Date(event.deliveredAt),
          providerMessageId: event.providerMessageId ?? null,
          lastError: null,
          updatedAt: new Date(),
        });

        await tx.orm.public.NotificationTarget.where((row) =>
          row.id.eq(notificationJob.targetId),
        ).update({
          lastDeliveryAt: new Date(event.deliveredAt),
          lastDeliveryError: null,
          updatedAt: new Date(),
        });
      });

      await this.pruneHistory({
        ownerType: notificationJob.ownerType,
        ownerId: notificationJob.ownerId,
      });

      if (notificationJob.sourceEntityType === "scheduled-message") {
        await this.scheduleNextRecurringJob(notificationJob.ruleId);
      }

      return;
    }

    const nextAttemptCount = notificationJob.attemptCount;
    const shouldRetry = event.retryable && nextAttemptCount <= 3;

    await this.prisma.db.transaction(async (tx) => {
      await tx.orm.public.NotificationTarget.where((row) =>
        row.id.eq(notificationJob.targetId),
      ).update({
        lastDeliveryError:
          event.errorMessage ??
          event.errorCode ??
          "Notification delivery failed",
        updatedAt: new Date(),
      });

      await tx.orm.public.NotificationJob.where((row) =>
        row.id.eq(notificationJob.id),
      ).update(
        shouldRetry
          ? {
              status: DbNotificationJobStatus.PENDING,
              lastError:
                event.errorMessage ??
                event.errorCode ??
                "Notification delivery failed",
              updatedAt: new Date(),
            }
          : {
              status: DbNotificationJobStatus.FAILED,
              processedAt: new Date(event.deliveredAt),
              lastError:
                event.errorMessage ??
                event.errorCode ??
                "Notification delivery failed",
              updatedAt: new Date(),
            },
      );
    });

    if (shouldRetry) {
      await this.enqueueNotificationJob(
        notificationJob.id,
        Math.max(30_000, nextAttemptCount * 30_000),
      );
      return;
    }

    await this.pruneHistory({
      ownerType: notificationJob.ownerType,
      ownerId: notificationJob.ownerId,
    });

    if (notificationJob.sourceEntityType === "scheduled-message") {
      await this.scheduleNextRecurringJob(notificationJob.ruleId);
    }
  }

  async rebuildJobsForRule(ruleId: number) {
    const notificationRule =
      await this.prisma.db.orm.public.NotificationRule.where((row) =>
        row.id.eq(ruleId),
      ).first();

    if (!notificationRule) {
      return;
    }

    await this.cancelPendingJobs({ ruleId });

    if (
      notificationRule.triggerType ===
        DbNotificationTriggerType.SCHEDULED_MESSAGE &&
      notificationRule.enabled &&
      notificationRule.scheduledAt
    ) {
      await this.rebuildScheduledMessageJobsForRule(notificationRule.id);
      return;
    }

    if (
      notificationRule.triggerType !==
        DbNotificationTriggerType.TIMER_BEFORE_SPAWN ||
      !notificationRule.enabled ||
      !notificationRule.guildId ||
      notificationRule.scheduleStrategy !==
        DbNotificationScheduleStrategy.SPAWN_WINDOW_RELATIVE ||
      notificationRule.scheduleAnchor === null ||
      notificationRule.scheduleOffsetMinutes === null
    ) {
      return;
    }

    let timersQuery = this.prisma.db.orm.public.Timer.where((row) =>
      and(row.guildId.eq(notificationRule.guildId), row.deletedAt.isNull()),
    );
    if (notificationRule.world) {
      timersQuery = timersQuery.where((row) =>
        row.world.eq(notificationRule.world),
      );
    }
    const timers = await timersQuery
      .select(
        "guildId",
        "world",
        "npcId",
        "timerKey",
        "minSpawnTime",
        "maxSpawnTime",
        "npc",
      )
      .all();

    await Promise.all(
      timers.map(async (timer) => {
        if (
          !this.matchingService.matchesTimerRule(
            notificationRule.filters,
            timer.npcId,
          )
        ) {
          return;
        }

        await this.rebuildTimerJobsForRule(notificationRule.id, {
          guildId: timer.guildId,
          world: timer.world,
          npcId: timer.npcId,
          timerKey: timer.timerKey,
          minSpawnTime: timer.minSpawnTime,
          maxSpawnTime: timer.maxSpawnTime,
          npc:
            timer.npc &&
            typeof timer.npc === "object" &&
            !Array.isArray(timer.npc)
              ? (timer.npc as { name?: string })
              : null,
        });
      }),
    );
  }

  async rebuildTimerJobsForRule(ruleId: number, event: TimerUpdatedEvent) {
    const notificationRule =
      await this.prisma.db.orm.public.NotificationRule.where((row) =>
        row.id.eq(ruleId),
      )
        .include("targets", (relation) => relation.include("target"))
        .first();

    if (
      !notificationRule ||
      !notificationRule.enabled ||
      notificationRule.scheduleStrategy !==
        DbNotificationScheduleStrategy.SPAWN_WINDOW_RELATIVE ||
      notificationRule.scheduleAnchor === null ||
      notificationRule.scheduleOffsetMinutes === null
    ) {
      return;
    }

    const sourceEntityId = this.getTimerSourceEntityId(event);
    await this.cancelPendingJobs({
      ruleId,
      sourceEntityType: "timer",
      sourceEntityId,
    });

    const hasRequiredPermissions =
      notificationRule.ownerType === DbNotificationOwnerType.USER
        ? true
        : await this.guildsService.hasRequiredGuildPermissions(
            notificationRule.ownerId,
          );

    const scheduledFor = this.calculateTimerNotificationSchedule({
      minSpawnTime: event.minSpawnTime,
      maxSpawnTime: event.maxSpawnTime,
      scheduleAnchor: notificationRule.scheduleAnchor,
      scheduleOffsetMinutes: notificationRule.scheduleOffsetMinutes,
    });

    const effectiveScheduledFor =
      scheduledFor.getTime() < Date.now() ? new Date() : scheduledFor;

    await Promise.all(
      notificationRule.targets.map(async (relation) => {
        if (!relation.target.active || !relation.target.canSend) {
          return;
        }

        const notificationJob = await this.createNotificationJob({
          notificationRule,
          target: relation.target,
          jobKind: DbNotificationJobKind.SCHEDULED,
          scheduledFor: effectiveScheduledFor,
          sourceEntityType: "timer",
          sourceEntityId,
          payloadSnapshot: this.contentService.buildTimerNotificationPayload({
            notificationRule,
            target: relation.target,
            npcId: event.npcId,
            npcName: event.npc?.name ?? null,
            world: event.world,
            timerKey: event.timerKey,
            minSpawnTime: new Date(event.minSpawnTime),
            maxSpawnTime: new Date(event.maxSpawnTime),
            scheduledFor: effectiveScheduledFor,
          }),
          forceBlocked:
            !hasRequiredPermissions ||
            !relation.target.canSend ||
            !relation.target.active,
        });

        if (
          notificationJob &&
          notificationJob.status === DbNotificationJobStatus.PENDING
        ) {
          const delay = Math.max(
            0,
            effectiveScheduledFor.getTime() - Date.now(),
          );
          await this.enqueueNotificationJob(notificationJob.id, delay);
        }
      }),
    );
  }

  async rebuildScheduledMessageJobsForRule(ruleId: number) {
    const notificationRule =
      await this.prisma.db.orm.public.NotificationRule.where((row) =>
        row.id.eq(ruleId),
      )
        .include("targets", (relation) => relation.include("target"))
        .first();

    if (
      !notificationRule ||
      !notificationRule.enabled ||
      !notificationRule.scheduledAt
    ) {
      return;
    }

    const scheduledAt = notificationRule.scheduledAt;

    if (scheduledAt.getTime() < Date.now()) {
      return;
    }

    if (
      notificationRule.scheduledUntil &&
      scheduledAt.getTime() > notificationRule.scheduledUntil.getTime()
    ) {
      return;
    }

    const hasRequiredPermissions =
      notificationRule.ownerType === DbNotificationOwnerType.USER
        ? true
        : await this.guildsService.hasRequiredGuildPermissions(
            notificationRule.ownerId,
          );

    await Promise.all(
      notificationRule.targets.map(async (relation) => {
        if (!relation.target.active || !relation.target.canSend) {
          return;
        }

        const notificationJob = await this.createNotificationJob({
          notificationRule,
          target: relation.target,
          jobKind: DbNotificationJobKind.SCHEDULED,
          scheduledFor: scheduledAt,
          sourceEntityType: "scheduled-message",
          sourceEntityId: String(notificationRule.id),
          payloadSnapshot: this.contentService.buildScheduledMessagePayload({
            notificationRule,
            target: relation.target,
            scheduledFor: scheduledAt,
          }),
          forceBlocked:
            !hasRequiredPermissions ||
            !relation.target.canSend ||
            !relation.target.active,
        });

        if (
          notificationJob &&
          notificationJob.status === DbNotificationJobStatus.PENDING
        ) {
          const delay = Math.max(0, scheduledAt.getTime() - Date.now());
          await this.enqueueNotificationJob(notificationJob.id, delay);
        }
      }),
    );
  }

  async scheduleNextRecurringJob(ruleId: number) {
    const notificationRule =
      await this.prisma.db.orm.public.NotificationRule.where((row) =>
        row.id.eq(ruleId),
      )
        .include("targets", (relation) => relation.include("target"))
        .first();

    if (
      !notificationRule ||
      !notificationRule.enabled ||
      !notificationRule.scheduledAt ||
      !notificationRule.scheduleIntervalType ||
      notificationRule.scheduleIntervalType ===
        DbNotificationScheduleIntervalType.ONCE
    ) {
      return;
    }

    const currentCycleJobs =
      await this.prisma.db.orm.public.NotificationJob.where((row) =>
        and(
          row.ruleId.eq(ruleId),
          row.scheduledFor.eq(notificationRule.scheduledAt),
          row.sourceEntityType.eq("scheduled-message"),
        ),
      )
        .select("status")
        .all();

    if (
      currentCycleJobs.some((job) => !FINAL_JOB_STATUSES.includes(job.status))
    ) {
      return;
    }

    const nextScheduledAt = calculateNextOccurrenceInTimeZone({
      currentScheduledAt: notificationRule.scheduledAt,
      intervalType: notificationRule.scheduleIntervalType,
      intervalValue: notificationRule.scheduleIntervalValue,
      weekday: notificationRule.scheduleWeekday,
      timeOfDay: notificationRule.scheduleTimeOfDay,
      timeZone:
        notificationRule.scheduleTimezone ??
        (notificationRule.ownerType === DbNotificationOwnerType.GUILD
          ? GUILD_NOTIFICATION_TIMEZONE
          : "UTC"),
    });

    if (!nextScheduledAt) {
      return;
    }

    if (
      notificationRule.scheduledUntil &&
      nextScheduledAt.getTime() > notificationRule.scheduledUntil.getTime()
    ) {
      return;
    }

    const updated = await this.prisma.db.orm.public.NotificationRule.where(
      (row) =>
        and(
          row.id.eq(ruleId),
          row.scheduledAt.eq(notificationRule.scheduledAt),
        ),
    ).updateAndCount({ scheduledAt: nextScheduledAt, updatedAt: new Date() });

    if (updated === 0) {
      return;
    }

    const hasRequiredPermissions =
      notificationRule.ownerType === DbNotificationOwnerType.USER
        ? true
        : await this.guildsService.hasRequiredGuildPermissions(
            notificationRule.ownerId,
          );

    await Promise.all(
      notificationRule.targets.map(async (relation) => {
        if (!relation.target.active || !relation.target.canSend) {
          return;
        }

        const notificationJob = await this.createNotificationJob({
          notificationRule,
          target: relation.target,
          jobKind: DbNotificationJobKind.SCHEDULED,
          scheduledFor: nextScheduledAt,
          sourceEntityType: "scheduled-message",
          sourceEntityId: String(notificationRule.id),
          payloadSnapshot: this.contentService.buildScheduledMessagePayload({
            notificationRule,
            target: relation.target,
            scheduledFor: nextScheduledAt,
          }),
          forceBlocked:
            !hasRequiredPermissions ||
            !relation.target.canSend ||
            !relation.target.active,
        });

        if (
          notificationJob &&
          notificationJob.status === DbNotificationJobStatus.PENDING
        ) {
          const delay = Math.max(0, nextScheduledAt.getTime() - Date.now());
          await this.enqueueNotificationJob(notificationJob.id, delay);
        }
      }),
    );
  }

  getRuleById(ruleId: number) {
    return this.prisma.db.orm.public.NotificationRule.where((row) =>
      row.id.eq(ruleId),
    )
      .include("targets", (relation) => relation.include("target"))
      .first()
      .then((rule) => (rule ? this.mapRuleResponse(rule) : null));
  }

  getTimerSourceEntityId(
    event: Pick<TimerUpdatedEvent, "guildId" | "world" | "timerKey">,
  ) {
    return `${event.guildId}:${event.world}:${event.timerKey}`;
  }

  private calculateTimerNotificationSchedule(params: {
    minSpawnTime: string | Date;
    maxSpawnTime: string | Date;
    scheduleAnchor: DbNotificationScheduleAnchor;
    scheduleOffsetMinutes: number;
  }) {
    const anchorTime =
      params.scheduleAnchor === DbNotificationScheduleAnchor.MAX_SPAWN
        ? new Date(params.maxSpawnTime)
        : new Date(params.minSpawnTime);

    return new Date(
      anchorTime.getTime() - params.scheduleOffsetMinutes * 60_000,
    );
  }

  private getNotificationTargetBlockedReason(target: {
    active: boolean;
    canSend: boolean;
    metadata?: JsonValue | null;
  }) {
    if (!target.active) {
      return "Notification target is disabled";
    }

    if (target.canSend) {
      return null;
    }

    const metadata =
      target.metadata && typeof target.metadata === "object"
        ? (target.metadata as JsonObject)
        : null;
    const missingPermissions = Array.isArray(metadata?.missingPermissions)
      ? metadata.missingPermissions.filter(
          (permission): permission is string => typeof permission === "string",
        )
      : [];

    if (missingPermissions.length === 0) {
      return "Discord channel is missing required permissions";
    }

    return `Discord channel is missing required permissions: ${missingPermissions.join(", ")}`;
  }

  private async getJobsForOwner(owner: OwnerContext) {
    const [pending, history] = await Promise.all([
      this.prisma.db.orm.public.NotificationJob.where((row) =>
        and(
          row.ownerType.eq(owner.ownerType),
          row.ownerId.eq(owner.ownerId),
          row.status.in([
            DbNotificationJobStatus.PENDING,
            DbNotificationJobStatus.PROCESSING,
            DbNotificationJobStatus.BLOCKED,
          ]),
        ),
      )
        .include("rule")
        .include("target")
        .orderBy([(row) => row.scheduledFor.asc()])
        .all(),
      this.prisma.db.orm.public.NotificationJob.where((row) =>
        and(
          row.ownerType.eq(owner.ownerType),
          row.ownerId.eq(owner.ownerId),
          row.status.in([...FINAL_JOB_STATUSES]),
        ),
      )
        .include("rule")
        .include("target")
        .orderBy([(row) => row.updatedAt.desc()])
        .limit(NOTIFICATIONS_HISTORY_RESPONSE_LIMIT)
        .all(),
    ]);

    return { pending, history };
  }

  private async pruneHistory(owner: OwnerContext) {
    const staleJobs = await this.prisma.db.orm.public.NotificationJob.where(
      (row) =>
        and(
          row.ownerType.eq(owner.ownerType),
          row.ownerId.eq(owner.ownerId),
          row.status.in([...FINAL_JOB_STATUSES]),
        ),
    )
      .select("id")
      .orderBy([(row) => row.updatedAt.desc()])
      .offset(NOTIFICATIONS_HISTORY_RETENTION_LIMIT)
      .all();

    if (staleJobs.length === 0) {
      return;
    }

    await this.prisma.db.orm.public.NotificationJob.where((row) =>
      row.id.in(staleJobs.map((job) => job.id)),
    ).deleteAndCount();
  }

  private async ensureGuildJob(guildId: string, jobId: string) {
    const notificationJob =
      await this.prisma.db.orm.public.NotificationJob.where((row) =>
        and(
          row.id.eq(jobId),
          row.ownerType.eq(DbNotificationOwnerType.GUILD),
          row.ownerId.eq(guildId),
        ),
      ).first();

    if (!notificationJob) {
      throw new NotFoundException(Error.NOTIFICATION_JOB_NOT_FOUND);
    }

    if (
      notificationJob.status !== DbNotificationJobStatus.PENDING &&
      notificationJob.status !== DbNotificationJobStatus.BLOCKED &&
      notificationJob.status !== DbNotificationJobStatus.PROCESSING
    ) {
      throw new BadRequestException(
        Error.ONLY_PENDING_NOTIFICATION_JOBS_CAN_BE_CANCELED,
      );
    }

    return notificationJob;
  }

  private mapJobResponse<
    T extends {
      payloadSnapshot: JsonValue | null;
      rule: {
        filters: JsonValue | null;
      };
    },
  >(job: T) {
    return {
      ...job,
      payloadSnapshot: this.parsePayloadSnapshot(job.payloadSnapshot),
      rule: this.mapRuleResponse(job.rule),
    };
  }

  private mapRuleResponse<
    T extends {
      filters: JsonValue | null;
    },
  >(rule: T) {
    return {
      ...rule,
      filters: this.parseNotificationFilters(rule.filters),
    };
  }

  private parseNotificationFilters(filters: JsonValue | null) {
    if (filters === null) {
      return null;
    }

    return NotificationFiltersResponseDto.schema.parse(filters);
  }

  private parsePayloadSnapshot(payloadSnapshot: JsonValue | null) {
    return NotificationJobPayloadSnapshotResponseDto.schema.parse(
      payloadSnapshot,
    );
  }
}
