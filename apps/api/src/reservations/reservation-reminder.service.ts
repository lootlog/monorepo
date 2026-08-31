import { and } from "@prisma/orm-family-sql/orm-client";
import {
  Inject,
  Injectable,
  UnprocessableEntityException,
} from "@nestjs/common";
import {
  NotificationJobKind,
  NotificationOwnerType,
  NotificationProvider,
  NotificationScheduleStrategy,
  NotificationTargetType,
  NotificationTriggerType,
} from "#src/db/domain";
import { PrismaService } from "#src/db/prisma.service";
import { NotificationJobService } from "#src/notifications/notification-job.service";
import { formatDiscordRelativeTimestamp } from "#src/notifications/utils/discord-timestamp.util";

const RESERVATION_REMINDER_RULE_NAME = "__system:reservation-reminder__";
const RESERVATION_SOURCE_ENTITY_TYPE = "reservation";

type ReminderContext = {
  target: {
    id: number;
    externalId: string;
    targetType: NotificationTargetType;
    active: boolean;
    canSend: boolean;
  };
  scheduledFor: Date;
};

@Injectable()
export class ReservationReminderService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    private readonly notificationJobService: NotificationJobService,
  ) {}

  async prepare(options: {
    discordId: string;
    startsAt: Date;
    reminderMinutesBefore: number | null;
  }): Promise<ReminderContext | null> {
    if (options.reminderMinutesBefore === null) {
      return null;
    }

    const scheduledFor = new Date(
      options.startsAt.getTime() - options.reminderMinutesBefore * 60_000,
    );
    if (scheduledFor.getTime() <= Date.now()) {
      throw new UnprocessableEntityException({
        code: "REMINDER_TIME_ELAPSED",
      });
    }

    const target = await this.prisma.db.orm.public.NotificationTarget.where(
      (row) =>
        and(
          row.ownerType.eq(NotificationOwnerType.USER),
          row.ownerId.eq(options.discordId),
          row.provider.eq(NotificationProvider.DISCORD),
          row.targetType.eq(NotificationTargetType.DM),
          row.active.eq(true),
          row.canSend.eq(true),
        ),
    )
      .select("id", "externalId", "targetType", "active", "canSend")
      .orderBy((notificationTarget) => notificationTarget.updatedAt.desc())
      .first();
    if (!target) {
      throw new UnprocessableEntityException({ code: "DM_TARGET_REQUIRED" });
    }

    return { target, scheduledFor };
  }

  async schedule(options: {
    context: ReminderContext | null;
    discordId: string;
    reservationId: number;
    spotName: string;
    organizationName: string;
    startsAt: Date;
  }): Promise<void> {
    if (!options.context) {
      return;
    }

    const rule = await this.getOrCreateRule(options.discordId);
    const startsAtIso = options.startsAt.toISOString();
    const startsAtDiscord = formatDiscordRelativeTimestamp(options.startsAt);
    const message = `Rezerwacja ${options.spotName} w ${options.organizationName} rozpoczyna się ${startsAtDiscord}.`;
    const notificationJob =
      await this.notificationJobService.createNotificationJob({
        notificationRule: {
          id: rule.id,
          ownerType: rule.ownerType,
          ownerId: rule.ownerId,
          guildId: rule.guildId,
          triggerType: rule.triggerType,
        },
        target: options.context.target,
        jobKind: NotificationJobKind.SCHEDULED,
        scheduledFor: options.context.scheduledFor,
        sourceEntityType: RESERVATION_SOURCE_ENTITY_TYPE,
        sourceEntityId: String(options.reservationId),
        payloadSnapshot: {
          title: "Nadchodząca rezerwacja",
          message,
          content: message,
          source: "reservation-reminder",
          reservationId: options.reservationId,
          spotName: options.spotName,
          organizationName: options.organizationName,
          startsAt: startsAtIso,
        },
      });

    if (!notificationJob) {
      return;
    }

    try {
      await this.notificationJobService.enqueueNotificationJob(
        notificationJob.id,
        Math.max(0, options.context.scheduledFor.getTime() - Date.now()),
      );
    } catch (error) {
      await this.notificationJobService.cancelPendingJobs({
        jobId: notificationJob.id,
      });
      throw error;
    }
  }

  cancel(reservationId: number): Promise<void> {
    return this.notificationJobService.cancelPendingJobs({
      sourceEntityType: RESERVATION_SOURCE_ENTITY_TYPE,
      sourceEntityId: String(reservationId),
    });
  }

  private async getOrCreateRule(discordId: string) {
    const existingRule = await this.prisma.db.orm.public.NotificationRule.where(
      (row) =>
        and(
          row.ownerType.eq(NotificationOwnerType.USER),
          row.ownerId.eq(discordId),
          row.name.eq(RESERVATION_REMINDER_RULE_NAME),
        ),
    )
      .select("id", "ownerType", "ownerId", "guildId", "triggerType")
      .first();
    if (existingRule) {
      return existingRule;
    }

    return this.prisma.db.transaction(async (transaction) => {
      const target = await transaction.orm.public.NotificationTarget.where(
        (row) =>
          and(
            row.ownerType.eq(NotificationOwnerType.USER),
            row.ownerId.eq(discordId),
            row.targetType.eq(NotificationTargetType.DM),
            row.active.eq(true),
            row.canSend.eq(true),
          ),
      )
        .select("id")
        .orderBy((notificationTarget) => notificationTarget.updatedAt.desc())
        .first();
      if (!target) {
        throw new UnprocessableEntityException({ code: "DM_TARGET_REQUIRED" });
      }
      const rule = await transaction.orm.public.NotificationRule.create({
        ownerType: NotificationOwnerType.USER,
        ownerId: discordId,
        triggerType: NotificationTriggerType.SCHEDULED_MESSAGE,
        name: RESERVATION_REMINDER_RULE_NAME,
        scheduleStrategy: NotificationScheduleStrategy.FIXED_DATETIME,
        enabled: true,
        updatedAt: new Date(),
      });
      await transaction.orm.public.NotificationRuleTarget.create({
        ruleId: rule.id,
        targetId: target.id,
      });
      return rule;
    });
  }
}
