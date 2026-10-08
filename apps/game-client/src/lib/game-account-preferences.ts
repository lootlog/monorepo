import {
  cloneDetector,
  cloneNotifications,
} from "@lootlog/domain/account-preferences";
import {
  defaultDetectorSettings,
  defaultNotificationsSettings,
  type DetectorRoutingRule,
  type DetectorSettings,
  type NotificationsSettings,
  type UserGameAccountPreferences,
} from "@lootlog/schema/account-preferences";

type GameAccountNotificationPreferences = Pick<
  UserGameAccountPreferences,
  "hasStoredNotifications" | "notifications"
>;

type GameAccountDetectorPreferences = Pick<
  UserGameAccountPreferences,
  "detector" | "hasStoredDetector"
>;

export const createNotificationsSettings = (
  guildIds: string[] = [],
): NotificationsSettings => ({
  ...cloneNotifications(defaultNotificationsSettings),
  guildIds: [...guildIds],
});

export const createDetectorSettings = (): DetectorSettings => {
  return cloneDetector(defaultDetectorSettings);
};

export const getEffectiveNotificationSettings = (
  preferences?: GameAccountNotificationPreferences | null,
) => {
  if (!preferences) {
    return cloneNotifications(defaultNotificationsSettings);
  }

  return cloneNotifications(preferences.notifications);
};

export const getEffectiveDetectorSettings = (
  preferences?: GameAccountDetectorPreferences | null,
) => {
  if (!preferences) {
    return cloneDetector(defaultDetectorSettings);
  }

  return cloneDetector(preferences.detector);
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
