import { randomUUID } from "node:crypto";
import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { InjectQueue } from "@nestjs/bullmq";
import {
  BadRequestException,
  Injectable,
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
  NotificationTargetType as DbNotificationTargetType,
  NotificationTriggerType as DbNotificationTriggerType,
  Prisma,
} from "prisma/generated/client";
import { DEFAULT_EXCHANGE_NAME } from "src/config/rabbitmq.config";
import { PrismaService } from "src/db/prisma.service";
import { RoutingKey } from "src/enum/routing-key.enum";
import { GuildsService } from "src/guilds/guilds.service";
import { GUILD_NOTIFICATION_TIMEZONE } from "src/notifications/constants/notification-schedule-timezone.constant";
import { NOTIFICATIONS_DISPATCH_QUEUE } from "src/notifications/constants/notifications-dispatch-queue.constant";
import {
  NOTIFICATIONS_HISTORY_RESPONSE_LIMIT,
  NOTIFICATIONS_HISTORY_RETENTION_LIMIT,
} from "src/notifications/constants/notifications-history.constant";
import { NotificationContentService } from "src/notifications/notification-content.service";
import { NotificationMatchingService } from "src/notifications/notification-matching.service";
import { Error } from "src/notifications/enum/error.enum";
import type { NotificationDispatchJobData } from "src/notifications/notifications-dispatch.processor";
import { calculateNextOccurrenceInTimeZone } from "src/notifications/utils/notification-schedule-time.util";

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

const FINAL_JOB_STATUSES = [
  DbNotificationJobStatus.SENT,
  DbNotificationJobStatus.FAILED,
  DbNotificationJobStatus.CANCELED,
] as const;

@Injectable()
export class NotificationJobService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly guildsService: GuildsService,
    private readonly contentService: NotificationContentService,
    private readonly matchingService: NotificationMatchingService,
    private readonly amqpConnection: AmqpConnection,
    @InjectQueue(NOTIFICATIONS_DISPATCH_QUEUE)
    private readonly notificationsQueue: Queue<NotificationDispatchJobData>,
  ) {}

  async listGuildJobs(guildId: string) {
    return this.getJobsForOwner({
      ownerType: DbNotificationOwnerType.GUILD,
      ownerId: guildId,
    });
  }

  async cancelGuildJob(guildId: string, jobId: string) {
    await this.ensureGuildJob(guildId, jobId);
    await this.cancelPendingJobs({ jobId });
    return { success: true };
  }

  async listUserJobs(userId: string) {
    return this.getJobsForOwner({
      ownerType: DbNotificationOwnerType.USER,
      ownerId: userId,
    });
  }

  async cancelPendingJobs(filters: {
    jobId?: string;
    ruleId?: number;
    targetId?: number;
    sourceEntityType?: string;
    sourceEntityId?: string;
  }) {
    const { jobId, ...remainingFilters } = filters;

    const jobs = await this.prisma.notificationJob.findMany({
      where: {
        ...remainingFilters,
        ...(jobId ? { id: jobId } : {}),
        status: {
          in: [
            DbNotificationJobStatus.PENDING,
            DbNotificationJobStatus.BLOCKED,
            DbNotificationJobStatus.PROCESSING,
          ],
        },
      },
      select: { id: true },
    });

    await Promise.all(
      jobs.map(async (job) => {
        const queueJob = await this.notificationsQueue.getJob(job.id);
        await queueJob?.remove();
      }),
    );

    if (jobs.length === 0) {
      return;
    }

    await this.prisma.notificationJob.updateMany({
      where: {
        id: {
          in: jobs.map((job) => job.id),
        },
      },
      data: {
        status: DbNotificationJobStatus.CANCELED,
        processedAt: new Date(),
      },
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
    payloadSnapshot: Prisma.InputJsonValue;
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
      return await this.prisma.notificationJob.create({
        data: {
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
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const existingJob = await this.prisma.notificationJob.findUnique({
          where: { idempotencyKey },
        });

        if (existingJob?.status !== DbNotificationJobStatus.CANCELED) {
          return null;
        }

        return this.prisma.$transaction(async (tx) => {
          await tx.notificationJob.update({
            where: { id: existingJob.id },
            data: {
              idempotencyKey: `${idempotencyKey}:canceled:${randomUUID()}`,
            },
          });

          return tx.notificationJob.create({
            data: {
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
            },
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
    const notificationJob = await this.prisma.notificationJob.findUnique({
      where: { id: notificationJobId },
      include: {
        rule: true,
        target: true,
      },
    });

    if (!notificationJob) {
      return;
    }

    if (
      notificationJob.status !== DbNotificationJobStatus.PENDING &&
      notificationJob.status !== DbNotificationJobStatus.BLOCKED
    ) {
      return;
    }

    const targetBlockedReason = this.getNotificationTargetBlockedReason(
      notificationJob.target,
    );

    if (targetBlockedReason) {
      await this.prisma.notificationJob.update({
        where: { id: notificationJob.id },
        data: {
          status: DbNotificationJobStatus.BLOCKED,
          blockedReason: targetBlockedReason,
          lastError: targetBlockedReason,
        },
      });
      return;
    }

    if (
      notificationJob.ownerType === DbNotificationOwnerType.GUILD &&
      !(await this.guildsService.hasRequiredGuildPermissions(
        notificationJob.ownerId,
      ))
    ) {
      await this.prisma.notificationJob.update({
        where: { id: notificationJob.id },
        data: {
          status: DbNotificationJobStatus.BLOCKED,
          blockedReason: "Missing Discord bot permissions",
          lastError: "Missing Discord bot permissions",
        },
      });
      return;
    }

    await this.prisma.notificationJob.update({
      where: { id: notificationJob.id },
      data: {
        status: DbNotificationJobStatus.PROCESSING,
        blockedReason: null,
        attemptCount: {
          increment: 1,
        },
      },
    });

    const payload = notificationJob.payloadSnapshot as
      | Prisma.JsonObject
      | null
      | undefined;

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
          typeof payload?.title === "string" ? payload.title : "Powiadomienie",
        message:
          typeof payload?.message === "string"
            ? payload.message
            : "Masz nowe powiadomienie",
        allowedMentions: this.contentService.parseAllowedMentions(
          payload?.allowedMentions,
        ),
        metadata: payload && typeof payload === "object" ? payload : undefined,
        target: {
          targetId: String(notificationJob.target.id),
          externalId: notificationJob.target.externalId,
          targetType: notificationJob.target.targetType,
        },
      },
    );
  }

  async handleDeliveryResult(event: DiscordNotificationDeliveryResultEvent) {
    const notificationJob = await this.prisma.notificationJob.findUnique({
      where: { id: event.notificationJobId },
    });

    if (!notificationJob) {
      return;
    }

    if (
      (FINAL_JOB_STATUSES as readonly DbNotificationJobStatus[]).includes(
        notificationJob.status,
      )
    ) {
      return;
    }

    if (event.success) {
      await this.prisma.$transaction(async (tx) => {
        await tx.notificationJob.update({
          where: { id: notificationJob.id },
          data: {
            status: DbNotificationJobStatus.SENT,
            processedAt: new Date(event.deliveredAt),
            providerMessageId: event.providerMessageId ?? null,
            lastError: null,
          },
        });

        await tx.notificationTarget.update({
          where: { id: notificationJob.targetId },
          data: {
            lastDeliveryAt: new Date(event.deliveredAt),
            lastDeliveryError: null,
          },
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
    const shouldRetry = event.retryable && nextAttemptCount < 3;

    await this.prisma.$transaction(async (tx) => {
      await tx.notificationTarget.update({
        where: { id: notificationJob.targetId },
        data: {
          lastDeliveryError:
            event.errorMessage ??
            event.errorCode ??
            "Notification delivery failed",
        },
      });

      await tx.notificationJob.update({
        where: { id: notificationJob.id },
        data: shouldRetry
          ? {
              status: DbNotificationJobStatus.PENDING,
              lastError:
                event.errorMessage ??
                event.errorCode ??
                "Notification delivery failed",
            }
          : {
              status: DbNotificationJobStatus.FAILED,
              processedAt: new Date(event.deliveredAt),
              lastError:
                event.errorMessage ??
                event.errorCode ??
                "Notification delivery failed",
            },
      });
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
    const notificationRule = await this.prisma.notificationRule.findUnique({
      where: { id: ruleId },
    });

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

    const timers = await this.prisma.timer.findMany({
      where: {
        guildId: notificationRule.guildId,
        ...(notificationRule.world ? { world: notificationRule.world } : {}),
      },
      select: {
        guildId: true,
        world: true,
        npcId: true,
        timerKey: true,
        minSpawnTime: true,
        maxSpawnTime: true,
        npc: true,
      },
    });

    for (const timer of timers) {
      if (
        !this.matchingService.matchesTimerRule(
          notificationRule.filters,
          timer.npcId,
        )
      ) {
        continue;
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
    }
  }

  async rebuildTimerJobsForRule(ruleId: number, event: TimerUpdatedEvent) {
    const notificationRule = await this.prisma.notificationRule.findUnique({
      where: { id: ruleId },
      include: {
        targets: {
          include: {
            target: true,
          },
        },
      },
    });

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

    for (const relation of notificationRule.targets) {
      if (!relation.target.active || !relation.target.canSend) {
        continue;
      }

      const scheduledFor = this.calculateTimerNotificationSchedule({
        minSpawnTime: event.minSpawnTime,
        maxSpawnTime: event.maxSpawnTime,
        scheduleAnchor: notificationRule.scheduleAnchor,
        scheduleOffsetMinutes: notificationRule.scheduleOffsetMinutes,
      });

      const effectiveScheduledFor =
        scheduledFor.getTime() < Date.now() ? new Date() : scheduledFor;

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
        const delay = Math.max(0, effectiveScheduledFor.getTime() - Date.now());
        await this.enqueueNotificationJob(notificationJob.id, delay);
      }
    }
  }

  async rebuildScheduledMessageJobsForRule(ruleId: number) {
    const notificationRule = await this.prisma.notificationRule.findUnique({
      where: { id: ruleId },
      include: {
        targets: {
          include: {
            target: true,
          },
        },
      },
    });

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

    for (const relation of notificationRule.targets) {
      if (!relation.target.active || !relation.target.canSend) {
        continue;
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
    }
  }

  async scheduleNextRecurringJob(ruleId: number) {
    const notificationRule = await this.prisma.notificationRule.findUnique({
      where: { id: ruleId },
      include: {
        targets: {
          include: { target: true },
        },
      },
    });

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

    const currentCycleJobs = await this.prisma.notificationJob.findMany({
      where: {
        ruleId,
        scheduledFor: notificationRule.scheduledAt,
        sourceEntityType: "scheduled-message",
      },
      select: { status: true },
    });

    if (
      currentCycleJobs.length > 0 &&
      currentCycleJobs.some(
        (job) =>
          !(FINAL_JOB_STATUSES as readonly DbNotificationJobStatus[]).includes(
            job.status,
          ),
      )
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

    const updated = await this.prisma.notificationRule.updateMany({
      where: { id: ruleId, scheduledAt: notificationRule.scheduledAt },
      data: { scheduledAt: nextScheduledAt },
    });

    if (updated.count === 0) {
      return;
    }

    const hasRequiredPermissions =
      notificationRule.ownerType === DbNotificationOwnerType.USER
        ? true
        : await this.guildsService.hasRequiredGuildPermissions(
            notificationRule.ownerId,
          );

    for (const relation of notificationRule.targets) {
      if (!relation.target.active || !relation.target.canSend) {
        continue;
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
    }
  }

  getRuleById(ruleId: number) {
    return this.prisma.notificationRule.findUnique({
      where: { id: ruleId },
      include: {
        targets: {
          include: {
            target: true,
          },
        },
      },
    });
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
    metadata?: Prisma.JsonValue | null;
  }) {
    if (!target.active) {
      return "Notification target is disabled";
    }

    if (target.canSend) {
      return null;
    }

    const metadata =
      target.metadata && typeof target.metadata === "object"
        ? (target.metadata as Prisma.JsonObject)
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
      this.prisma.notificationJob.findMany({
        where: {
          ownerType: owner.ownerType,
          ownerId: owner.ownerId,
          status: {
            in: [
              DbNotificationJobStatus.PENDING,
              DbNotificationJobStatus.PROCESSING,
              DbNotificationJobStatus.BLOCKED,
            ],
          },
        },
        include: {
          rule: true,
          target: true,
        },
        orderBy: [{ scheduledFor: "asc" }],
      }),
      this.prisma.notificationJob.findMany({
        where: {
          ownerType: owner.ownerType,
          ownerId: owner.ownerId,
          status: {
            in: FINAL_JOB_STATUSES as unknown as DbNotificationJobStatus[],
          },
        },
        include: {
          rule: true,
          target: true,
        },
        orderBy: [{ updatedAt: "desc" }],
        take: NOTIFICATIONS_HISTORY_RESPONSE_LIMIT,
      }),
    ]);

    return { pending, history };
  }

  private async pruneHistory(owner: OwnerContext) {
    const staleJobs = await this.prisma.notificationJob.findMany({
      where: {
        ownerType: owner.ownerType,
        ownerId: owner.ownerId,
        status: {
          in: FINAL_JOB_STATUSES as unknown as DbNotificationJobStatus[],
        },
      },
      orderBy: [{ updatedAt: "desc" }],
      skip: NOTIFICATIONS_HISTORY_RETENTION_LIMIT,
      select: { id: true },
    });

    if (staleJobs.length === 0) {
      return;
    }

    await this.prisma.notificationJob.deleteMany({
      where: {
        id: {
          in: staleJobs.map((job) => job.id),
        },
      },
    });
  }

  private async ensureGuildJob(guildId: string, jobId: string) {
    const notificationJob = await this.prisma.notificationJob.findFirst({
      where: {
        id: jobId,
        ownerType: DbNotificationOwnerType.GUILD,
        ownerId: guildId,
      },
    });

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
}
