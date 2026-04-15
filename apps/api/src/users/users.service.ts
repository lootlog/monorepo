import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import type { Logger as WinstonLogger } from "winston";
import { firstValueFrom } from "rxjs";
import { PrismaService } from "src/db/prisma.service";
import { AuthService } from "src/auth/auth.service";
import { battlelogConfig } from "src/config/battlelog.config";
import { MembersService } from "src/members/members.service";
import { RedisService } from "@lootlog/nest-shared";
import type { Prisma } from "src/generated/prisma/client";
import { getUserLootlogConfigCachePattern } from "src/shared/constants/cache.constant";
import {
  defaultNotificationsSettings,
  type NotificationSettings,
  type NotificationType,
  type NotificationsSettings,
  type UpdateUserGameAccountPreferencesPayload,
  type UserGameAccountPreferences,
} from "@lootlog/types";
import type { UpdateUserGameAccountPreferencesDto } from "src/users/dto/update-user-account-preferences.dto";
import type { UpdateUserPreferencesDto } from "src/users/dto/update-user-preferences.dto";

type DeleteAccountParams = {
  authUserId: string;
  discordId: string;
};

@Injectable()
export class UsersService {
  private readonly battlelogServiceUrl: string;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: WinstonLogger,
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly membersService: MembersService,
    private readonly redisService: RedisService,
    private readonly httpService: HttpService,
  ) {
    this.battlelogServiceUrl = battlelogConfig.serviceUrl;
  }

  async getUserPreferences(userId: string) {
    const userSettings = await this.prisma.userSettings.findUnique({
      where: { userId },
    });

    const settings = userSettings ?? this.createDefaultUserPreferences(userId);

    return this.toUserPreferencesResponse(settings);
  }

  async deleteAccount({ authUserId, discordId }: DeleteAccountParams) {
    await this.triggerBattlelogCleanup(authUserId);

    const deletedMembers = await this.prisma.$transaction(async (tx) => {
      const members = await tx.member.findMany({
        where: { userId: discordId },
        select: {
          id: true,
          guildId: true,
          globalUserId: true,
          userId: true,
        },
      });

      const memberIds = members.map((member) => member.id);

      if (memberIds.length > 0) {
        await tx.npcKillStats.deleteMany({
          where: { memberId: { in: memberIds } },
        });
      }

      await tx.userKillStats.deleteMany({ where: { userId: discordId } });
      await tx.userCharactersLootlogSettings.deleteMany({
        where: { userId: discordId },
      });
      await tx.userSettings.deleteMany({ where: { userId: authUserId } });
      await tx.userGameAccountSettings.deleteMany({
        where: { userId: authUserId },
      });
      await tx.userTimerSettings.deleteMany({ where: { userId: authUserId } });
      await tx.userSoundSettings.deleteMany({ where: { userId: authUserId } });
      await tx.userGuildTimerSettings.deleteMany({
        where: { userId: authUserId },
      });
      await tx.userGuildEventSettings.deleteMany({
        where: { userId: authUserId },
      });

      await Promise.all(
        members.map((member) =>
          tx.member.update({
            where: { id: member.id },
            data: {
              active: false,
              lastDiscordAttemptAt: new Date(),
              lastDiscordStatus: "ACCOUNT_DELETED",
              roles: { set: [] },
            },
          }),
        ),
      );

      return members.map((member) => ({
        discordId: member.userId,
        guildId: member.guildId,
        globalUserId: member.globalUserId,
      }));
    });

    await Promise.all([
      this.authService.invalidateIdpTokenCache(authUserId),
      this.membersService.notifyMembersRemoved(deletedMembers),
      this.redisService.deleteByPattern(
        getUserLootlogConfigCachePattern(discordId),
      ),
    ]);
  }

  private async triggerBattlelogCleanup(userId: string): Promise<void> {
    const battlelogUrl = `${this.battlelogServiceUrl}/internal/delete-user-data`;
    const cleanupResponse = await firstValueFrom(
      this.httpService.post<{ status?: string }>(
        battlelogUrl,
        { userId },
        { timeout: 5000 },
      ),
    ).catch((error: unknown) => {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to trigger battlelog cleanup for user ${userId}: ${errorMessage}`,
      );
      throw new ServiceUnavailableException({
        message: "BATTLELOG_SERVICE_UNAVAILABLE",
        retryAfter: 60,
      });
    });

    if (cleanupResponse.data?.status !== "ACCEPTED") {
      this.logger.warn(
        `Unexpected battlelog cleanup response for user ${userId}: ${JSON.stringify(cleanupResponse.data)}`,
      );
      throw new ServiceUnavailableException({
        message: "BATTLELOG_SERVICE_UNAVAILABLE",
        retryAfter: 60,
      });
    }
  }

  async updateUserPreferences(
    userId: string,
    preferences: UpdateUserPreferencesDto,
  ) {
    const userSettings = await this.prisma.userSettings.upsert({
      where: { userId },
      update: { ...preferences, updatedAt: new Date() },
      create: { userId, ...preferences },
    });

    return this.toUserPreferencesResponse(userSettings);
  }

  async getUserGameAccountPreferences(
    userId: string,
    accountId: string,
  ): Promise<UserGameAccountPreferences> {
    const gameAccountSettings =
      await this.prisma.userGameAccountSettings.findUnique({
        where: {
          userId_accountId: {
            userId,
            accountId,
          },
        },
      });
    const storedGameAccountSettings = this.getStoredGameAccountSettings(
      gameAccountSettings?.settings,
    );

    return {
      accountId,
      notifications: this.normalizeNotificationsSettings(
        storedGameAccountSettings?.notifications,
      ),
      hasStoredPreferences: !!storedGameAccountSettings?.notifications,
    };
  }

  async updateUserGameAccountPreferences(
    userId: string,
    accountId: string,
    preferences: UpdateUserGameAccountPreferencesDto,
  ): Promise<UserGameAccountPreferences> {
    const gameAccountSettings =
      await this.prisma.userGameAccountSettings.findUnique({
        where: {
          userId_accountId: {
            userId,
            accountId,
          },
        },
      });
    const storedGameAccountSettings = this.getStoredGameAccountSettings(
      gameAccountSettings?.settings,
    );
    const currentNotifications = this.normalizeNotificationsSettings(
      storedGameAccountSettings?.notifications,
    );

    const nextNotifications = preferences.notifications
      ? this.mergeNotificationsSettings(currentNotifications, {
          notifications: preferences.notifications,
        })
      : currentNotifications;

    const nextSettings = {
      ...(storedGameAccountSettings ?? {}),
      notifications: nextNotifications,
    };

    await this.prisma.userGameAccountSettings.upsert({
      where: {
        userId_accountId: {
          userId,
          accountId,
        },
      },
      update: {
        settings: nextSettings as Prisma.InputJsonValue,
        updatedAt: new Date(),
      },
      create: {
        userId,
        accountId,
        settings: nextSettings as Prisma.InputJsonValue,
      },
    });

    return {
      accountId,
      notifications: nextNotifications,
      hasStoredPreferences: true,
    };
  }

  private toUserPreferencesResponse(settings: {
    userId: string;
    guildsOrder: string[];
    theme: string;
    colorMode: string;
  }) {
    return {
      userId: settings.userId,
      guildsOrder: settings.guildsOrder,
      theme: settings.theme,
      colorMode: settings.colorMode,
    };
  }

  private createDefaultUserPreferences(userId: string) {
    return {
      id: 0,
      userId,
      ...this.getDefaultUserPreferencesData(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private getDefaultUserPreferencesData() {
    return {
      guildsOrder: [],
      theme: "default",
      colorMode: "dark",
    };
  }

  private getStoredGameAccountSettings(settings: Prisma.JsonValue | undefined) {
    if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
      return null;
    }

    return settings as Prisma.JsonObject & {
      notifications?: Partial<NotificationsSettings>;
    };
  }

  private mergeNotificationsSettings(
    currentSettings: NotificationsSettings,
    preferences: UpdateUserGameAccountPreferencesPayload,
  ): NotificationsSettings {
    const mergedSettings = this.cloneNotificationsSettings(currentSettings);

    if (!preferences.notifications) {
      return mergedSettings;
    }

    const notificationTypes = Object.keys(
      defaultNotificationsSettings,
    ) as NotificationType[];

    for (const notificationType of notificationTypes) {
      const patch = preferences.notifications[notificationType];

      if (!patch) {
        continue;
      }

      mergedSettings[notificationType] = this.normalizeNotificationSettings(
        patch,
        mergedSettings[notificationType],
      );
    }

    return mergedSettings;
  }

  private normalizeNotificationsSettings(
    settings: Partial<NotificationsSettings> | undefined,
  ): NotificationsSettings {
    const notificationTypes = Object.keys(
      defaultNotificationsSettings,
    ) as NotificationType[];
    const normalizedSettings = this.cloneNotificationsSettings(
      defaultNotificationsSettings,
    );

    for (const notificationType of notificationTypes) {
      normalizedSettings[notificationType] = this.normalizeNotificationSettings(
        settings?.[notificationType],
        defaultNotificationsSettings[notificationType],
      );
    }

    return normalizedSettings;
  }

  private normalizeNotificationSettings(
    settings: Partial<NotificationSettings> | undefined,
    fallbackSettings: NotificationSettings,
  ): NotificationSettings {
    const autoHideTimeout =
      typeof settings?.autoHideTimeout === "number" &&
      settings.autoHideTimeout >= 0
        ? settings.autoHideTimeout
        : fallbackSettings.autoHideTimeout;

    return {
      show:
        typeof settings?.show === "boolean"
          ? settings.show
          : fallbackSettings.show,
      highlight:
        typeof settings?.highlight === "boolean"
          ? settings.highlight
          : fallbackSettings.highlight,
      ignoreOtherWorlds:
        typeof settings?.ignoreOtherWorlds === "boolean"
          ? settings.ignoreOtherWorlds
          : fallbackSettings.ignoreOtherWorlds,
      autoHideTimeout,
      guildIds: Array.isArray(settings?.guildIds)
        ? settings.guildIds.filter(
            (guildId): guildId is string => typeof guildId === "string",
          )
        : [...fallbackSettings.guildIds],
      sound:
        typeof settings?.sound === "boolean"
          ? settings.sound
          : fallbackSettings.sound,
    };
  }

  private cloneNotificationsSettings(
    settings: NotificationsSettings,
  ): NotificationsSettings {
    const notificationTypes = Object.keys(settings) as NotificationType[];

    return notificationTypes.reduce((acc, notificationType) => {
      acc[notificationType] = {
        ...settings[notificationType],
        guildIds: [...settings[notificationType].guildIds],
      };

      return acc;
    }, {} as NotificationsSettings);
  }
}
