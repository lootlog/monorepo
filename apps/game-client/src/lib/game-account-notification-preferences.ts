import {
  defaultNotificationsSettings,
  type NotificationsSettings,
  type UserGameAccountPreferences,
} from "@lootlog/types";

export const USER_GAME_ACCOUNT_PREFERENCES_QUERY_KEY_PREFIX =
  "user-game-account-preferences";
export const UPDATE_USER_GAME_ACCOUNT_PREFERENCES_MUTATION_KEY_PREFIX =
  "update-user-game-account-preferences";

const notificationTypes = Object.keys(defaultNotificationsSettings) as Array<
  keyof NotificationsSettings
>;

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
  return notificationTypes.reduce((acc, notificationType) => {
    acc[notificationType] = {
      ...settings[notificationType],
      guildIds: [...settings[notificationType].guildIds],
    };

    return acc;
  }, {} as NotificationsSettings);
};

export const createNotificationsSettings = (guildIds: string[] = []) => {
  const settings = cloneNotificationsSettings(defaultNotificationsSettings);

  return notificationTypes.reduce((acc, notificationType) => {
    acc[notificationType] = {
      ...settings[notificationType],
      guildIds: [...guildIds],
    };

    return acc;
  }, {} as NotificationsSettings);
};

export const getEffectiveNotificationSettings = (
  preferences?: UserGameAccountPreferences | null,
) => {
  if (!preferences) {
    return cloneNotificationsSettings(defaultNotificationsSettings);
  }

  return cloneNotificationsSettings(preferences.notifications);
};
