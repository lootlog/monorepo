import {
  DETECTOR_NPC_TYPES,
  defaultDetectorSettings,
  defaultNotificationsSettings,
  type DetectorRoutingRule,
  type DetectorSettings,
  type NotificationsSettings,
  type UserGameAccountPreferences,
} from "@lootlog/schema/account-preferences";
import { getUsersControllerGetUserGameAccountPreferencesQueryKey } from "@lootlog/client/main";

const UPDATE_USER_GAME_ACCOUNT_PREFERENCES_MUTATION_KEY_PREFIX =
  "update-user-game-account-preferences";

const notificationSettingTypes = Object.keys(
  defaultNotificationsSettings,
) as Array<keyof NotificationsSettings>;

type GameAccountNotificationPreferences = Pick<
  UserGameAccountPreferences,
  "hasStoredNotifications" | "notifications"
>;
type GameAccountDetectorPreferences = Pick<
  UserGameAccountPreferences,
  "detector" | "hasStoredDetector"
>;

export const getUserGameAccountPreferencesQueryKey = (accountId: string) =>
  getUsersControllerGetUserGameAccountPreferencesQueryKey({ accountId });

export const getUpdateUserGameAccountPreferencesMutationKey = (
  accountId: string,
) =>
  [
    UPDATE_USER_GAME_ACCOUNT_PREFERENCES_MUTATION_KEY_PREFIX,
    accountId,
  ] as const;

const cloneNotificationsSettings = (
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
      world: rule.world,
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
  preferences?: GameAccountNotificationPreferences | null,
) => {
  if (!preferences) {
    return cloneNotificationsSettings(defaultNotificationsSettings);
  }

  return cloneNotificationsSettings(preferences.notifications);
};

export const getEffectiveDetectorSettings = (
  preferences?: GameAccountDetectorPreferences | null,
) => {
  if (!preferences) {
    return cloneDetectorSettings(defaultDetectorSettings);
  }

  return cloneDetectorSettings(preferences.detector);
};

export const isNotificationPreferencesReady = (
  preferences?: GameAccountNotificationPreferences | null,
) => {
  return Boolean(preferences?.hasStoredNotifications);
};

export const isDetectorPreferencesReady = (
  preferences?: GameAccountDetectorPreferences | null,
) => {
  return Boolean(preferences?.hasStoredDetector);
};

export const resolveDetectorGuildIds = (
  routingRules: DetectorRoutingRule[],
  npcLevel: number,
  currentWorld?: string,
) => {
  const resolvedGuildIds = new Set<string>();
  const normalizedCurrentWorld = currentWorld?.trim().toLowerCase();

  routingRules.forEach((rule) => {
    if (npcLevel < rule.minLevel || npcLevel > rule.maxLevel) {
      return;
    }

    const normalizedRuleWorld = rule.world?.trim().toLowerCase();

    if (normalizedRuleWorld && normalizedRuleWorld !== normalizedCurrentWorld) {
      return;
    }

    rule.guildIds.forEach((guildId) => {
      resolvedGuildIds.add(guildId);
    });
  });

  return [...resolvedGuildIds];
};
