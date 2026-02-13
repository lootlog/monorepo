import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import {
  NotificationDeliveryStatus,
  type Prisma,
} from "prisma/generated/client";
import { DEFAULT_EXCHANGE_NAME } from "src/config/rabbitmq.config";
import {
  type BotPermissionsStatus,
  DiscordBotClientService,
} from "src/discord-bot/discord-bot.service";
import { PrismaService } from "src/db/prisma.service";
import type { GuildNotificationCommandDto } from "src/notifications/dto/guild-notification-command.dto";
import type { SetGuildDiscordNotificationConfigDto } from "src/notifications/dto/set-guild-discord-notification-config.dto";
import { RoutingKey } from "src/notifications/enums/routing-key.enum";
import { PermissionsService } from "src/permissions/permissions.service";

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly amqpConnection: AmqpConnection,
    private readonly permissionsService: PermissionsService,
    private readonly discordBotClientService: DiscordBotClientService,
  ) {}

  async getGuildConfig(options: {
    discordId: string;
    userId: string;
    guildId: string;
  }) {
    const { discordId, userId, guildId } = options;

    await this.permissionsService.ensureAdminOrOwner(
      discordId,
      userId,
      guildId,
    );

    const config = await this.prisma.guildDiscordNotificationConfig.findUnique({
      where: { guildId },
    });

    return {
      guildId,
      channelId: config?.channelId ?? null,
      enabled: config?.enabled ?? false,
      updatedAt: config?.updatedAt?.toISOString() ?? null,
    };
  }

  async setGuildConfig(options: {
    discordId: string;
    userId: string;
    guildId: string;
    data: SetGuildDiscordNotificationConfigDto;
  }) {
    const { discordId, userId, guildId, data } = options;

    await this.permissionsService.ensureAdminOrOwner(
      discordId,
      userId,
      guildId,
    );

    if (data.enabled && !data.channelId) {
      throw new BadRequestException(
        "channelId is required when notifications are enabled",
      );
    }

    const config = await this.prisma.guildDiscordNotificationConfig.upsert({
      where: { guildId },
      update: {
        channelId: data.channelId ?? null,
        enabled: data.enabled,
        updatedByDiscordId: discordId,
      },
      create: {
        guildId,
        channelId: data.channelId ?? null,
        enabled: data.enabled,
        updatedByDiscordId: discordId,
      },
    });

    return {
      guildId,
      channelId: config.channelId,
      enabled: config.enabled,
      updatedAt: config.updatedAt.toISOString(),
    };
  }

  async getPermissionsStatus(options: {
    discordId: string;
    userId: string;
    guildId: string;
    force: boolean;
  }) {
    const { discordId, userId, guildId, force } = options;

    await this.permissionsService.ensureAdminOrOwner(
      discordId,
      userId,
      guildId,
    );

    const config = await this.prisma.guildDiscordNotificationConfig.findUnique({
      where: { guildId },
    });

    if (!config || !config.enabled || !config.channelId) {
      return {
        ok: true,
        missingPermissions: [],
        checkedAt: new Date().toISOString(),
        cacheTtlSeconds: 0,
        reason: "NOT_CONFIGURED",
      };
    }

    try {
      const status =
        await this.discordBotClientService.getGuildBotPermissionsStatus({
          guildId,
          channelId: config.channelId,
          force,
        });

      await this.upsertPermissionStatus(guildId, status);

      return status;
    } catch (error) {
      const cachedStatus =
        await this.prisma.guildBotPermissionStatus.findUnique({
          where: { guildId },
        });

      if (!cachedStatus) {
        throw error;
      }

      return {
        ok: cachedStatus.ok,
        missingPermissions: Array.isArray(cachedStatus.missingPermissions)
          ? (cachedStatus.missingPermissions as string[])
          : [],
        checkedAt: cachedStatus.checkedAt.toISOString(),
        cacheTtlSeconds: 0,
        reason: "STALE",
      };
    }
  }

  async handleGuildNotificationCommand(data: GuildNotificationCommandDto) {
    if (data.type !== "NPC_TITAN") {
      return;
    }

    const existingLog = await this.prisma.notificationDeliveryLog.findUnique({
      where: { eventId: data.eventId },
    });

    if (existingLog?.status === NotificationDeliveryStatus.SENT) {
      this.logger.debug(
        `Skipping duplicate notification event ${data.eventId}`,
      );
      return;
    }

    const config = await this.prisma.guildDiscordNotificationConfig.findUnique({
      where: { guildId: data.guildId },
    });

    if (!config || !config.enabled || !config.channelId) {
      if (existingLog) {
        await this.prisma.notificationDeliveryLog.update({
          where: { eventId: data.eventId },
          data: {
            status: NotificationDeliveryStatus.FAILED,
            errorCode: "CONFIG_NOT_FOUND",
            errorMessage:
              "Guild notification channel is not configured or notifications are disabled",
          },
        });
      } else {
        await this.createDeliveryLog({
          eventId: data.eventId,
          guildId: data.guildId,
          notificationId: data.notificationId,
          channelId: config?.channelId ?? null,
          type: data.type,
          payload: data as unknown as Prisma.InputJsonValue,
          status: NotificationDeliveryStatus.FAILED,
          errorCode: "CONFIG_NOT_FOUND",
          errorMessage:
            "Guild notification channel is not configured or notifications are disabled",
        });
      }
      return;
    }

    if (existingLog) {
      await this.prisma.notificationDeliveryLog.update({
        where: { eventId: data.eventId },
        data: {
          status: NotificationDeliveryStatus.PENDING,
          errorCode: null,
          errorMessage: null,
          channelId: config.channelId,
        },
      });
    } else {
      await this.createDeliveryLog({
        eventId: data.eventId,
        guildId: data.guildId,
        notificationId: data.notificationId,
        channelId: config.channelId,
        type: data.type,
        payload: data as unknown as Prisma.InputJsonValue,
        status: NotificationDeliveryStatus.PENDING,
      });
    }

    try {
      const permissionStatus =
        await this.discordBotClientService.getGuildBotPermissionsStatus({
          guildId: data.guildId,
          channelId: config.channelId,
          force: false,
        });

      await this.upsertPermissionStatus(data.guildId, permissionStatus);

      if (!permissionStatus.ok) {
        await this.prisma.notificationDeliveryLog.update({
          where: { eventId: data.eventId },
          data: {
            status: NotificationDeliveryStatus.FAILED,
            errorCode: "MISSING_BOT_PERMISSIONS",
            errorMessage: permissionStatus.missingPermissions.join(", "),
          },
        });
        return;
      }

      this.amqpConnection.publish(
        DEFAULT_EXCHANGE_NAME,
        RoutingKey.DISCORD_NOTIFICATIONS_GUILD_SEND,
        {
          ...data,
          channelId: config.channelId,
        },
      );

      await this.prisma.notificationDeliveryLog.update({
        where: { eventId: data.eventId },
        data: {
          status: NotificationDeliveryStatus.SENT,
        },
      });
    } catch (error) {
      await this.prisma.notificationDeliveryLog.update({
        where: { eventId: data.eventId },
        data: {
          status: NotificationDeliveryStatus.FAILED,
          errorCode: "DISPATCH_ERROR",
          errorMessage:
            error instanceof Error ? error.message : "unknown error",
          attemptCount: {
            increment: 1,
          },
        },
      });

      this.logger.error(
        `Failed to dispatch notification ${data.eventId}: ${error instanceof Error ? error.message : "unknown error"}`,
      );
      throw error;
    }
  }

  private async createDeliveryLog(data: {
    eventId: string;
    guildId: string;
    notificationId: string;
    channelId: string | null;
    type: string;
    payload: Prisma.InputJsonValue;
    status: NotificationDeliveryStatus;
    errorCode?: string;
    errorMessage?: string;
  }) {
    await this.prisma.notificationDeliveryLog.create({
      data,
    });
  }

  private async upsertPermissionStatus(
    guildId: string,
    status: BotPermissionsStatus,
  ) {
    await this.prisma.guildBotPermissionStatus.upsert({
      where: { guildId },
      update: {
        ok: status.ok,
        missingPermissions:
          status.missingPermissions as unknown as Prisma.InputJsonValue,
        checkedAt: new Date(status.checkedAt),
        source: status.source ?? "LIVE",
      },
      create: {
        guildId,
        ok: status.ok,
        missingPermissions:
          status.missingPermissions as unknown as Prisma.InputJsonValue,
        checkedAt: new Date(status.checkedAt),
        source: status.source ?? "LIVE",
      },
    });
  }
}
