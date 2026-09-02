import { Injectable, UnprocessableEntityException } from "@nestjs/common";
import {
  NotificationJobKind,
  type NotificationTargetType,
} from "#src/notifications/notification-enums";
import { NotificationJobService } from "#src/notifications/notification-job.service";
import { formatDiscordRelativeTimestamp } from "#src/notifications/utils/discord-timestamp.util";
import { ReservationReminderRepository } from "./reservation-reminder.repository.js";

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
    private readonly repository: ReservationReminderRepository,
    private readonly notificationJobService: Pick<
      NotificationJobService,
      "createNotificationJob" | "enqueueNotificationJob" | "cancelPendingJobs"
    >,
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

    const target = await this.repository.findActiveDiscordDmTarget(
      options.discordId,
    );
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
    const rule = await this.repository.getOrCreateRule(discordId);
    if (!rule) {
      throw new UnprocessableEntityException({ code: "DM_TARGET_REQUIRED" });
    }
    return rule;
  }
}
