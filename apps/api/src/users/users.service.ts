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
import { MEMBER_LAST_DISCORD_STATUS } from "src/members/constants/member-discord-status.constant";
import { MembersService } from "src/members/members.service";
import { RedisService } from "@lootlog/nest-shared/redis";
import type { Prisma } from "src/generated/prisma/client";
import { getUserLootlogConfigCachePattern } from "src/shared/constants/cache.constant";
import {
  CHAT_APPEARANCE_READABLE_PRESET,
  DETECTOR_NPC_TYPES,
  defaultAirTagPreferences,
  defaultDetectorSettings,
  defaultMapPingPreferences,
  defaultNotificationsSettings,
  mergeChatAppearanceSettings,
  normalizeChatAppearanceSettings,
  type DetectorNpcType,
  type AirTagPreferences,
  type DetectorRoutingRule,
  type DetectorSettings,
  type DetectorSettingsPatch,
  type DetectorTypeSettings,
  type DetectorTypeSettingsPatch,
  type MutedNpcPreference,
  type MutedPlayerPreference,
  type NotificationMutes,
  type NotificationSettings,
  type NotificationType,
  type NotificationsSettings,
  type MapPingPreferences,
  type UpdateUserGameAccountPreferencesPayload,
  type UserGameAccountPreferences,
  type UserPreferences,
} from "@lootlog/types";
import { applySettingsPatch } from "src/settings-documents/settings-resolver";
import {
  GuildsService,
  type CurrentUserGuildAccessSummary,
} from "src/guilds/guilds.service";
import type { UpdateUserGameAccountPreferencesDto } from "src/users/dto/update-user-account-preferences.dto";
import type { UpdateUserPreferencesDto } from "src/users/dto/update-user-preferences.dto";

type DeleteAccountParams = {
  authUserId: string;
  discordId: string;
};

const GLOBAL_NOTIFICATION_MUTES_ACCOUNT_ID = "__global-notification-mutes__";
const DETECTOR_LEVEL_MIN = 0;
const DETECTOR_LEVEL_MAX = 500;

const resolvePreferenceUpdate = <Current, Patch>(
  current: Current,
  patch: Patch | undefined,
  merge: (patch: Patch) => Current,
): Current => (patch ? merge(patch) : current);

const hasStoredPreference = (
  storedValue: unknown,
  providedValue: unknown,
): boolean => storedValue !== undefined || providedValue !== undefined;

type MutedNpcPreferenceInput = Pick<
  MutedNpcPreference,
  "npcKey" | "npcId" | "name" | "npcType" | "lvl"
> &
  Partial<Pick<MutedNpcPreference, "prof" | "icon">>;

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
    private readonly guildsService: GuildsService,
  ) {
    this.battlelogServiceUrl = battlelogConfig.serviceUrl;
  }

  async getUserPreferences(userId: string) {
    const [userSettings, notificationMutesSettings, appearanceDocument] =
      await Promise.all([
        this.prisma.userSettings.findUnique({
          where: { userId },
        }),
        this.prisma.userGameAccountSettings.findUnique({
          where: {
            userId_accountId: {
              userId,
              accountId: GLOBAL_NOTIFICATION_MUTES_ACCOUNT_ID,
            },
          },
        }),
        this.prisma.userSettingDocument?.findUnique({
          where: {
            userId_domain_scopeType_scopeId: {
              userId,
              domain: "appearance",
              scopeType: "USER",
              scopeId: userId,
            },
          },
        }),
      ]);

    const settings = userSettings ?? this.createDefaultUserPreferences(userId);
    const mutes = this.getStoredNotificationMutes(
      notificationMutesSettings?.settings,
    );

    return this.toUserPreferencesResponse(
      settings,
      mutes,
      this.getChatAppearanceFromOverrides(appearanceDocument?.overrides),
    );
  }

  getCurrentUserGuilds(
    discordId: string,
    userId: string,
  ): Promise<CurrentUserGuildAccessSummary[]> {
    return this.guildsService.getCurrentUserGuildAccessSummaries(
      discordId,
      userId,
    );
  }

  getCurrentUserAccessibleGuilds(discordId: string, userId: string) {
    return this.guildsService.getCurrentUserAccessibleGuilds(discordId, userId);
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
      await tx.userSettingDocument.deleteMany({
        where: { userId: authUserId },
      });
      await tx.userGameAccountSettings.deleteMany({
        where: { userId: authUserId },
      });
      await tx.userTimerSettings.deleteMany({ where: { userId: authUserId } });
      await tx.userSoundSettings.deleteMany({ where: { userId: authUserId } });
      await tx.userGuildTimerSettings.deleteMany({
        where: { userId: authUserId },
      });
      await tx.userPinnedEvent.deleteMany({
        where: { userId: authUserId },
      });

      await Promise.all(
        members.map((member) =>
          tx.member.update({
            where: { id: member.id },
            data: {
              active: false,
              lastDiscordAttemptAt: new Date(),
              lastDiscordStatus: MEMBER_LAST_DISCORD_STATUS.ACCOUNT_DELETED,
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
    const [currentUserSettings, currentMutes, currentAppearanceDocument] =
      await Promise.all([
        this.prisma.userSettings.findUnique({ where: { userId } }),
        this.getUserNotificationMutes(userId),
        this.prisma.userSettingDocument?.findUnique({
          where: {
            userId_domain_scopeType_scopeId: {
              userId,
              domain: "appearance",
              scopeType: "USER",
              scopeId: userId,
            },
          },
        }),
      ]);
    const legacyChatAppearance = (
      currentUserSettings as { chatAppearance?: unknown } | null
    )?.chatAppearance;
    const nextChatAppearance = preferences.chatAppearance
      ? mergeChatAppearanceSettings(
          this.getChatAppearanceFromOverrides(
            currentAppearanceDocument?.overrides,
            legacyChatAppearance,
          ),
          preferences.chatAppearance,
        )
      : undefined;
    const nextUserSettingsPayload = {
      ...(preferences.guildsOrder !== undefined
        ? { guildsOrder: preferences.guildsOrder }
        : {}),
      ...(preferences.hiddenGuildIds !== undefined
        ? { hiddenGuildIds: preferences.hiddenGuildIds }
        : {}),
      ...(preferences.theme !== undefined ? { theme: preferences.theme } : {}),
    };
    const shouldUpdateUserSettings =
      Object.keys(nextUserSettingsPayload).length > 0;
    const nextMutes = preferences.mutes
      ? this.mergeNotificationMutes(currentMutes, preferences)
      : currentMutes;

    const [userSettings] = await Promise.all([
      shouldUpdateUserSettings
        ? this.prisma.userSettings.upsert({
            where: { userId },
            update: {
              ...nextUserSettingsPayload,
              updatedAt: new Date(),
            },
            create: {
              userId,
              ...this.getDefaultUserPreferencesData(),
              ...nextUserSettingsPayload,
            },
          })
        : Promise.resolve(currentUserSettings),
      preferences.mutes
        ? this.prisma.userGameAccountSettings.upsert({
            where: {
              userId_accountId: {
                userId,
                accountId: GLOBAL_NOTIFICATION_MUTES_ACCOUNT_ID,
              },
            },
            update: {
              settings: {
                mutes: nextMutes,
              } as unknown as Prisma.InputJsonValue,
              updatedAt: new Date(),
            },
            create: {
              userId,
              accountId: GLOBAL_NOTIFICATION_MUTES_ACCOUNT_ID,
              settings: {
                mutes: nextMutes,
              } as unknown as Prisma.InputJsonValue,
            },
          })
        : Promise.resolve(null),
      nextChatAppearance && this.prisma.userSettingDocument
        ? this.prisma.userSettingDocument.upsert({
            where: {
              userId_domain_scopeType_scopeId: {
                userId,
                domain: "appearance",
                scopeType: "USER",
                scopeId: userId,
              },
            },
            create: {
              userId,
              domain: "appearance",
              scopeType: "USER",
              scopeId: userId,
              overrides: {
                chat: nextChatAppearance,
              } as unknown as Prisma.InputJsonValue,
              schemaVersion: 1,
            },
            update: {
              overrides: applySettingsPatch({
                domain: "appearance",
                scope: { type: "USER", id: userId },
                currentOverrides:
                  currentAppearanceDocument?.overrides &&
                  typeof currentAppearanceDocument.overrides === "object" &&
                  !Array.isArray(currentAppearanceDocument.overrides)
                    ? (currentAppearanceDocument.overrides as Record<
                        string,
                        unknown
                      >)
                    : {},
                set: { chat: nextChatAppearance },
                unset: [],
              }) as Prisma.InputJsonValue,
              schemaVersion: 1,
            },
          })
        : Promise.resolve(null),
    ]);

    return this.toUserPreferencesResponse(
      userSettings ?? this.createDefaultUserPreferences(userId),
      nextMutes,
      nextChatAppearance ??
        this.getChatAppearanceFromOverrides(
          currentAppearanceDocument?.overrides,
          legacyChatAppearance,
        ),
    );
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
    const hasStoredNotifications =
      storedGameAccountSettings?.notifications !== undefined;
    const hasStoredDetector = storedGameAccountSettings?.detector !== undefined;
    const hasStoredPings = storedGameAccountSettings?.pings !== undefined;
    const hasStoredAirTags = storedGameAccountSettings?.airTags !== undefined;

    return {
      accountId,
      notifications: this.normalizeNotificationsSettings(
        storedGameAccountSettings?.notifications,
      ),
      detector: this.normalizeDetectorSettings(
        storedGameAccountSettings?.detector,
      ),
      pings: this.normalizeMapPingPreferences(storedGameAccountSettings?.pings),
      airTags: this.normalizeAirTagPreferences(
        storedGameAccountSettings?.airTags,
      ),
      hasStoredNotifications,
      hasStoredDetector,
      hasStoredPings,
      hasStoredAirTags,
      hasStoredPreferences:
        hasStoredNotifications ||
        hasStoredDetector ||
        hasStoredPings ||
        hasStoredAirTags,
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
    const currentDetector = this.normalizeDetectorSettings(
      storedGameAccountSettings?.detector,
    );
    const currentPings = this.normalizeMapPingPreferences(
      storedGameAccountSettings?.pings,
    );
    const currentAirTags = this.normalizeAirTagPreferences(
      storedGameAccountSettings?.airTags,
    );

    const nextNotifications = resolvePreferenceUpdate(
      currentNotifications,
      preferences.notifications,
      (notifications) =>
        this.mergeNotificationsSettings(currentNotifications, {
          notifications,
        }),
    );
    const nextDetector = resolvePreferenceUpdate(
      currentDetector,
      preferences.detector,
      (detector) => this.mergeDetectorSettings(currentDetector, { detector }),
    );
    const nextPings = resolvePreferenceUpdate(
      currentPings,
      preferences.pings,
      (pings) =>
        this.normalizeMapPingPreferences({ ...currentPings, ...pings }),
    );
    const nextAirTags = resolvePreferenceUpdate(
      currentAirTags,
      preferences.airTags,
      (airTags) =>
        this.normalizeAirTagPreferences({ ...currentAirTags, ...airTags }),
    );
    const hasStoredNotifications = hasStoredPreference(
      storedGameAccountSettings?.notifications,
      preferences.notifications,
    );
    const hasStoredDetector = hasStoredPreference(
      storedGameAccountSettings?.detector,
      preferences.detector,
    );
    const hasStoredPings = hasStoredPreference(
      storedGameAccountSettings?.pings,
      preferences.pings,
    );
    const hasStoredAirTags = hasStoredPreference(
      storedGameAccountSettings?.airTags,
      preferences.airTags,
    );

    const nextSettings = {
      ...storedGameAccountSettings,
      ...(hasStoredNotifications ? { notifications: nextNotifications } : {}),
      ...(hasStoredDetector ? { detector: nextDetector } : {}),
      ...(hasStoredPings ? { pings: nextPings } : {}),
      ...(hasStoredAirTags ? { airTags: nextAirTags } : {}),
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
      detector: nextDetector,
      pings: nextPings,
      airTags: nextAirTags,
      hasStoredNotifications,
      hasStoredDetector,
      hasStoredPings,
      hasStoredAirTags,
      hasStoredPreferences: [
        hasStoredNotifications,
        hasStoredDetector,
        hasStoredPings,
        hasStoredAirTags,
      ].some(Boolean),
    };
  }

  private toUserPreferencesResponse(
    settings: {
      userId: string;
      guildsOrder: string[];
      hiddenGuildIds: string[];
      theme: string;
    },
    mutes: NotificationMutes,
    chatAppearance = CHAT_APPEARANCE_READABLE_PRESET,
  ): UserPreferences {
    return {
      userId: settings.userId,
      guildsOrder: settings.guildsOrder,
      hiddenGuildIds: settings.hiddenGuildIds,
      theme: settings.theme,
      chatAppearance: normalizeChatAppearanceSettings(chatAppearance),
      mutes: this.cloneNotificationMutes(mutes),
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
      hiddenGuildIds: [],
      theme: "default",
    };
  }

  private getChatAppearanceFromOverrides(
    overrides: unknown,
    fallback: unknown = CHAT_APPEARANCE_READABLE_PRESET,
  ) {
    if (
      !overrides ||
      typeof overrides !== "object" ||
      Array.isArray(overrides)
    ) {
      return normalizeChatAppearanceSettings(fallback);
    }

    const chatAppearance = (overrides as { chat?: unknown }).chat;
    return normalizeChatAppearanceSettings(
      chatAppearance,
      normalizeChatAppearanceSettings(fallback),
    );
  }

  private async getUserNotificationMutes(userId: string) {
    const notificationMutesSettings =
      await this.prisma.userGameAccountSettings.findUnique({
        where: {
          userId_accountId: {
            userId,
            accountId: GLOBAL_NOTIFICATION_MUTES_ACCOUNT_ID,
          },
        },
      });

    return this.getStoredNotificationMutes(notificationMutesSettings?.settings);
  }

  private getStoredNotificationMutes(
    settings: Prisma.JsonValue | undefined,
  ): NotificationMutes {
    if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
      return this.cloneNotificationMutes();
    }

    const settingsObject = settings as Prisma.JsonObject & {
      mutes?: Partial<NotificationMutes>;
    };

    return this.normalizeNotificationMutes(settingsObject.mutes);
  }

  private getStoredGameAccountSettings(settings: Prisma.JsonValue | undefined) {
    if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
      return null;
    }

    return settings as Prisma.JsonObject & {
      notifications?: Partial<NotificationsSettings>;
      detector?: Partial<DetectorSettings>;
      pings?: Partial<MapPingPreferences>;
      airTags?: Partial<AirTagPreferences>;
    };
  }

  private normalizeMapPingPreferences(
    preferences: Partial<MapPingPreferences> | undefined,
  ): MapPingPreferences {
    return {
      enabled:
        typeof preferences?.enabled === "boolean"
          ? preferences.enabled
          : defaultMapPingPreferences.enabled,
    };
  }

  private normalizeAirTagPreferences(
    preferences: Partial<AirTagPreferences> | undefined,
  ): AirTagPreferences {
    return {
      enabled:
        typeof preferences?.enabled === "boolean"
          ? preferences.enabled
          : defaultAirTagPreferences.enabled,
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

  private mergeDetectorSettings(
    currentSettings: DetectorSettings,
    preferences: UpdateUserGameAccountPreferencesPayload,
  ): DetectorSettings {
    const mergedSettings = this.cloneDetectorSettings(currentSettings);

    if (!preferences.detector) {
      return mergedSettings;
    }

    if (Array.isArray(preferences.detector.routingRules)) {
      mergedSettings.routingRules = this.normalizeDetectorRoutingRules(
        preferences.detector.routingRules,
      );
    }

    for (const detectorType of DETECTOR_NPC_TYPES) {
      const patch = preferences.detector[detectorType];

      if (!patch) {
        continue;
      }

      mergedSettings[detectorType] = this.normalizeDetectorTypeSettings(
        patch,
        mergedSettings[detectorType],
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
        settings?.[notificationType] === undefined
          ? defaultNotificationsSettings[notificationType]
          : {
              ...defaultNotificationsSettings[notificationType],
              ignoreOtherWorlds: false,
            },
      );
    }

    return normalizedSettings;
  }

  private mergeNotificationMutes(
    currentMutes: NotificationMutes,
    preferences: Pick<UpdateUserPreferencesDto, "mutes">,
  ): NotificationMutes {
    const mergedMutes = this.cloneNotificationMutes(currentMutes);

    if (!preferences.mutes) {
      return mergedMutes;
    }

    return {
      players: preferences.mutes.players
        ? this.normalizeMutedPlayers(preferences.mutes.players)
        : mergedMutes.players,
      npcs: preferences.mutes.npcs
        ? this.normalizeMutedNpcs(preferences.mutes.npcs)
        : mergedMutes.npcs,
    };
  }

  private normalizeDetectorSettings(
    settings: DetectorSettingsPatch | Partial<DetectorSettings> | undefined,
  ): DetectorSettings {
    const normalizedSettings = this.cloneDetectorSettings(
      defaultDetectorSettings,
    );

    normalizedSettings.routingRules = Array.isArray(settings?.routingRules)
      ? this.normalizeDetectorRoutingRules(settings.routingRules)
      : defaultDetectorSettings.routingRules.map((rule) => ({
          ...rule,
          guildIds: [...rule.guildIds],
        }));

    for (const detectorType of DETECTOR_NPC_TYPES) {
      normalizedSettings[detectorType] = this.normalizeDetectorTypeSettings(
        settings?.[detectorType],
        defaultDetectorSettings[detectorType],
      );
    }

    return normalizedSettings;
  }

  private normalizeNotificationMutes(
    mutes: Partial<NotificationMutes> | undefined,
  ): NotificationMutes {
    return {
      players: this.normalizeMutedPlayers(mutes?.players),
      npcs: this.normalizeMutedNpcs(mutes?.npcs),
    };
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

  private normalizeMutedPlayers(
    players: MutedPlayerPreference[] | undefined,
  ): MutedPlayerPreference[] {
    if (!Array.isArray(players)) {
      return [];
    }

    const dedupedPlayers = new Map<string, MutedPlayerPreference>();

    for (const player of players) {
      if (!player || typeof player !== "object") {
        continue;
      }

      if (
        typeof player.discordId !== "string" ||
        player.discordId.length === 0
      ) {
        continue;
      }

      dedupedPlayers.set(player.discordId, {
        discordId: player.discordId,
        displayName:
          typeof player.displayName === "string" ? player.displayName : "",
      });
    }

    return [...dedupedPlayers.values()];
  }

  private normalizeMutedNpcs(
    npcs: MutedNpcPreferenceInput[] | undefined,
  ): MutedNpcPreference[] {
    if (!Array.isArray(npcs)) {
      return [];
    }

    const allowedNpcTypes = new Set<DetectorNpcType>(DETECTOR_NPC_TYPES);
    const dedupedNpcs = new Map<string, MutedNpcPreference>();

    for (const npc of npcs) {
      if (!npc || typeof npc !== "object") {
        continue;
      }

      const isValidNpcType =
        typeof npc.npcType === "string" &&
        allowedNpcTypes.has(npc.npcType as DetectorNpcType);

      if (
        typeof npc.npcKey !== "string" ||
        npc.npcKey.length === 0 ||
        typeof npc.name !== "string" ||
        npc.name.length === 0 ||
        typeof npc.npcId !== "number" ||
        Number.isNaN(npc.npcId) ||
        !Number.isInteger(npc.npcId) ||
        !isValidNpcType ||
        typeof npc.lvl !== "number" ||
        Number.isNaN(npc.lvl)
      ) {
        continue;
      }

      dedupedNpcs.set(npc.npcKey, {
        npcKey: npc.npcKey,
        npcId: npc.npcId,
        name: npc.name,
        npcType: npc.npcType as DetectorNpcType,
        lvl: Math.max(1, Math.trunc(npc.lvl)),
        prof: typeof npc.prof === "string" ? npc.prof : null,
        icon: typeof npc.icon === "string" ? npc.icon : null,
      });
    }

    return [...dedupedNpcs.values()];
  }

  private normalizeDetectorTypeSettings(
    settings:
      | DetectorTypeSettingsPatch
      | Partial<DetectorTypeSettings>
      | undefined,
    fallbackSettings: DetectorTypeSettings,
  ): DetectorTypeSettings {
    return {
      detect:
        typeof settings?.detect === "boolean"
          ? settings.detect
          : fallbackSettings.detect,
      autoSend:
        typeof settings?.autoSend === "boolean"
          ? settings.autoSend
          : fallbackSettings.autoSend,
      notifyWindow:
        typeof settings?.notifyWindow === "boolean"
          ? settings.notifyWindow
          : fallbackSettings.notifyWindow,
      highlight:
        typeof settings?.highlight === "boolean"
          ? settings.highlight
          : fallbackSettings.highlight,
      notifySound:
        typeof settings?.notifySound === "boolean"
          ? settings.notifySound
          : fallbackSettings.notifySound,
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

  private normalizeDetectorRoutingRules(
    routingRules: DetectorRoutingRule[],
  ): DetectorRoutingRule[] {
    return routingRules.reduce<DetectorRoutingRule[]>((acc, rule, index) => {
      if (!rule || typeof rule !== "object") {
        return acc;
      }

      const rawMinLevel =
        typeof rule.minLevel === "number" ? Math.trunc(rule.minLevel) : null;
      const rawMaxLevel =
        typeof rule.maxLevel === "number" ? Math.trunc(rule.maxLevel) : null;

      if (
        rawMinLevel === null ||
        rawMaxLevel === null ||
        Number.isNaN(rawMinLevel) ||
        Number.isNaN(rawMaxLevel)
      ) {
        return acc;
      }

      const normalizedMinLevel = Math.min(
        DETECTOR_LEVEL_MAX,
        Math.max(DETECTOR_LEVEL_MIN, rawMinLevel),
      );
      const normalizedMaxLevel = Math.min(
        DETECTOR_LEVEL_MAX,
        Math.max(DETECTOR_LEVEL_MIN, rawMaxLevel),
      );
      const minLevel = Math.min(normalizedMinLevel, normalizedMaxLevel);
      const maxLevel = Math.max(normalizedMinLevel, normalizedMaxLevel);
      const name = typeof rule.name === "string" ? rule.name.trim() : undefined;
      const world =
        typeof rule.world === "string" ? rule.world.trim() : undefined;

      acc.push({
        id:
          typeof rule.id === "string" && rule.id.length > 0
            ? rule.id
            : `rule-${index + 1}`,
        name: name && name.length > 0 ? name : undefined,
        minLevel,
        maxLevel,
        world: world && world.length > 0 ? world : undefined,
        guildIds: Array.isArray(rule.guildIds)
          ? rule.guildIds.filter(
              (guildId): guildId is string => typeof guildId === "string",
            )
          : [],
      });

      return acc;
    }, []);
  }

  private cloneDetectorSettings(settings: DetectorSettings): DetectorSettings {
    const clonedSettings = {
      routingRules: settings.routingRules.map((rule) => ({
        ...rule,
        guildIds: [...rule.guildIds],
      })),
    } as DetectorSettings;

    DETECTOR_NPC_TYPES.forEach((detectorType) => {
      clonedSettings[detectorType] = {
        ...settings[detectorType],
      };
    });

    return clonedSettings;
  }

  private cloneNotificationMutes(
    mutes: NotificationMutes = { players: [], npcs: [] },
  ): NotificationMutes {
    return {
      players: (mutes.players ?? []).map((player) => ({ ...player })),
      npcs: (mutes.npcs ?? []).map((npc) => ({ ...npc })),
    };
  }
}
