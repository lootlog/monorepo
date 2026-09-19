import type { DetectorNpcType } from "./account-preferences.js";
import type { ChatAppearanceSettings } from "./chat-appearance.js";

export type MutedPlayerPreference = {
  discordId: string;
  displayName: string;
};

export type MutedNpcPreference = {
  npcKey: string;
  npcId: number;
  name: string;
  npcType: DetectorNpcType;
  lvl: number;
  prof: string | null;
  icon: string | null;
};

export type NotificationMutes = {
  players: MutedPlayerPreference[];
  npcs: MutedNpcPreference[];
};

export type NotificationMutesPatch = {
  players?: MutedPlayerPreference[];
  npcs?: MutedNpcPreference[];
};

export interface UserPreferences {
  userId: string;
  guildsOrder: string[];
  hiddenGuildIds: string[];
  theme: string;
  chatAppearance: ChatAppearanceSettings;
  mutes: NotificationMutes;
}

export interface UpdateUserPreferencesPayload {
  guildsOrder?: string[];
  hiddenGuildIds?: string[];
  theme?: string;
  chatAppearance?: Partial<ChatAppearanceSettings>;
  mutes?: NotificationMutesPatch;
}

export const defaultNotificationMutes: NotificationMutes = {
  players: [],
  npcs: [],
};
