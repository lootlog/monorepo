import {
  type NotificationMutes,
  type UserPreferences,
} from "@lootlog/types";

export const USER_PREFERENCES_QUERY_KEY_PREFIX = "user-preferences";
export const UPDATE_USER_PREFERENCES_MUTATION_KEY_PREFIX =
  "update-user-preferences";

export const getUserPreferencesQueryKey = () =>
  [USER_PREFERENCES_QUERY_KEY_PREFIX] as const;

export const getUpdateUserPreferencesMutationKey = () =>
  [UPDATE_USER_PREFERENCES_MUTATION_KEY_PREFIX] as const;

export const cloneNotificationMutes = (
  mutes: NotificationMutes = { players: [], npcs: [] },
): NotificationMutes => {
  return {
    players: (mutes.players ?? []).map((player) => ({ ...player })),
    npcs: (mutes.npcs ?? []).map((npc) => ({ ...npc })),
  };
};

export const getEffectiveNotificationMutes = (
  preferences?: UserPreferences | null,
) => {
  if (!preferences) {
    return cloneNotificationMutes();
  }

  return cloneNotificationMutes(preferences.mutes);
};
