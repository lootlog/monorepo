import {
  DETECTOR_NPC_TYPES,
  defaultDetectorSettings,
  defaultNotificationsSettings,
  type DetectorRoutingRule,
  type DetectorSettings,
  type DetectorTypeSettings,
  type DetectorNpcType,
  type NotificationsSettings,
  type UserGameAccountPreferences,
} from "@lootlog/types";

export const USER_GAME_ACCOUNT_PREFERENCES_QUERY_KEY_PREFIX =
  "user-game-account-preferences";
export const UPDATE_USER_GAME_ACCOUNT_PREFERENCES_MUTATION_KEY_PREFIX =
  "update-user-game-account-preferences";

const notificationSettingTypes = Object.keys(
  defaultNotificationsSettings,
) as Array<keyof NotificationsSettings>;

export const getUserGameAccountPreferencesQueryKey = (accountId: string) =>
  [USER_GAME_ACCOUNT_PREFERENCES_QUERY_KEY_PREFIX, accountId] as const;

export const getUpdateUserGameAccountPreferencesMutationKey = (
  accountId: string,
) =>
  [
    UPDATE_USER_GAME_ACCOUNT_PREFERENCES_MUTATION_KEY_PREFIX,
    accountId,
  ] as const;

export const cloneNotificationsSettings = (
  settings: NotificationsSettings,
): NotificationsSettings => {
  return notificationSettingTypes.reduce((acc, notificationType) => {
    acc[notificationType] = {
      ...settings[notificationType],
      guildIds: [...settings[notificationType].guildIds],
    };

    return acc;
  }, {} as NotificationsSettings);
};

export const createNotificationsSettings = (guildIds: string[] = []) => {
  const settings = cloneNotificationsSettings(defaultNotificationsSettings);

  return notificationSettingTypes.reduce((acc, notificationType) => {
    acc[notificationType] = {
      ...settings[notificationType],
      guildIds: [...guildIds],
    };

    return acc;
  }, {} as NotificationsSettings);
};

export const cloneDetectorSettings = (
  settings: DetectorSettings,
): DetectorSettings => {
  const clonedSettings = {
    routingRules: settings.routingRules.map((rule) => ({
      ...rule,
      guildIds: [...rule.guildIds],
    })),
  } as DetectorSettings;

  DETECTOR_NPC_TYPES.forEach((npcType) => {
    clonedSettings[npcType] = {
      ...settings[npcType],
    };
  });

  return clonedSettings;
};

export const createDetectorSettings = (): DetectorSettings => {
  return cloneDetectorSettings(defaultDetectorSettings);
};

export const getEffectiveNotificationSettings = (
  preferences?: UserGameAccountPreferences | null,
) => {
  if (!preferences) {
    return cloneNotificationsSettings(defaultNotificationsSettings);
  }

  return cloneNotificationsSettings(preferences.notifications);
};

export const getEffectiveDetectorSettings = (
  preferences?: UserGameAccountPreferences | null,
) => {
  if (!preferences) {
    return cloneDetectorSettings(defaultDetectorSettings);
  }

  return cloneDetectorSettings(preferences.detector);
};

export const isNotificationPreferencesReady = (
  preferences?: UserGameAccountPreferences | null,
) => {
  return Boolean(preferences?.hasStoredNotifications);
};

export const isDetectorPreferencesReady = (
  preferences?: UserGameAccountPreferences | null,
) => {
  return Boolean(preferences?.hasStoredDetector);
};

export const resolveDetectorGuildIds = (
  routingRules: DetectorRoutingRule[],
  npcLevel: number,
) => {
  const resolvedGuildIds = new Set<string>();

  routingRules.forEach((rule) => {
    if (npcLevel < rule.minLevel || npcLevel > rule.maxLevel) {
      return;
    }

    rule.guildIds.forEach((guildId) => {
      resolvedGuildIds.add(guildId);
    });
  });

  return [...resolvedGuildIds];
};

export const getDetectorSettingsByNpcType = (
  detectorSettings: DetectorSettings,
  npcType: DetectorNpcType,
): DetectorTypeSettings => {
  return detectorSettings[npcType];
};
