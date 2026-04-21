import { type NotificationMutes, type UserPreferences } from "@lootlog/types";

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
