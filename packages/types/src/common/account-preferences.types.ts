export type NotificationType =
  | "ELITE2"
  | "HERO"
  | "COLOSSUS"
  | "TITAN"
  | "message"
  | "party-gathering";

export interface NotificationSettings {
  show: boolean;
  highlight: boolean;
  ignoreOtherWorlds: boolean;
  autoHideTimeout?: number;
  guildIds: string[];
  sound: boolean;
}

export type NotificationsSettings = Record<
  NotificationType,
  NotificationSettings
>;

export interface UserGameAccountPreferences {
  accountId: string;
  notifications: NotificationsSettings;
  hasStoredPreferences: boolean;
}

export interface UpdateUserGameAccountPreferencesPayload {
  notifications?: Partial<
    Record<NotificationType, Partial<NotificationSettings>>
  >;
}

export const defaultNotificationsSettings: NotificationsSettings = {
  ELITE2: {
    show: false,
    highlight: false,
    ignoreOtherWorlds: false,
    autoHideTimeout: 0,
    guildIds: [],
    sound: false,
  },
  HERO: {
    show: true,
    highlight: true,
    ignoreOtherWorlds: false,
    autoHideTimeout: 0,
    guildIds: [],
    sound: false,
  },
  COLOSSUS: {
    show: true,
    highlight: true,
    ignoreOtherWorlds: false,
    autoHideTimeout: 0,
    guildIds: [],
    sound: false,
  },
  TITAN: {
    show: true,
    highlight: true,
    ignoreOtherWorlds: false,
    autoHideTimeout: 0,
    guildIds: [],
    sound: false,
  },
  message: {
    show: true,
    highlight: true,
    ignoreOtherWorlds: false,
    autoHideTimeout: 0,
    guildIds: [],
    sound: false,
  },
  "party-gathering": {
    show: true,
    highlight: true,
    ignoreOtherWorlds: false,
    autoHideTimeout: 0,
    guildIds: [],
    sound: false,
  },
};
