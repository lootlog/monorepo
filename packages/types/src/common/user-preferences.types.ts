import type { DetectorNpcType } from "./account-preferences.types.js";
import type { ChatAppearanceSettings } from "./chat-appearance-settings.js";

export interface MutedPlayerPreference {
  discordId: string;
  displayName: string;
}

export interface MutedNpcPreference {
  npcKey: string;
  npcId: number;
  name: string;
  npcType: DetectorNpcType;
  lvl: number;
  prof: string | null;
  icon: string | null;
}

export interface NotificationMutes {
  players: MutedPlayerPreference[];
  npcs: MutedNpcPreference[];
}

export interface NotificationMutesPatch {
  players?: MutedPlayerPreference[];
  npcs?: MutedNpcPreference[];
}

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
