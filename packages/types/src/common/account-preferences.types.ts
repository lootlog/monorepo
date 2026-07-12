export type NotificationType =
  | "ELITE2"
  | "HERO"
  | "COLOSSUS"
  | "TITAN"
  | "message"
  | "party-gathering";

export type DetectorNpcType = "ELITE2" | "HERO" | "COLOSSUS" | "TITAN";
export const DETECTOR_NPC_TYPES = [
  "ELITE2",
  "HERO",
  "COLOSSUS",
  "TITAN",
] as const satisfies readonly DetectorNpcType[];

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

export interface DetectorRoutingRule {
  id: string;
  name?: string;
  minLevel: number;
  maxLevel: number;
  world?: string;
  guildIds: string[];
}

export interface DetectorTypeSettings {
  detect: boolean;
  autoSend: boolean;
  notifyWindow: boolean;
  highlight: boolean;
  notifySound: boolean;
}

export interface DetectorSettings {
  routingRules: DetectorRoutingRule[];
  ELITE2: DetectorTypeSettings;
  HERO: DetectorTypeSettings;
  COLOSSUS: DetectorTypeSettings;
  TITAN: DetectorTypeSettings;
}

export interface MapPingPreferences {
  enabled: boolean;
}

export type DetectorTypeSettingsPatch = Partial<DetectorTypeSettings>;

export interface DetectorSettingsPatch {
  routingRules?: DetectorRoutingRule[];
  ELITE2?: DetectorTypeSettingsPatch;
  HERO?: DetectorTypeSettingsPatch;
  COLOSSUS?: DetectorTypeSettingsPatch;
  TITAN?: DetectorTypeSettingsPatch;
}

export interface UserGameAccountPreferences {
  accountId: string;
  notifications: NotificationsSettings;
  detector: DetectorSettings;
  pings: MapPingPreferences;
  hasStoredNotifications: boolean;
  hasStoredDetector: boolean;
  hasStoredPings: boolean;
  hasStoredPreferences: boolean;
}

export interface UpdateUserGameAccountPreferencesPayload {
  notifications?: Partial<
    Record<NotificationType, Partial<NotificationSettings>>
  >;
  detector?: DetectorSettingsPatch;
  pings?: Partial<MapPingPreferences>;
}

export const defaultMapPingPreferences: MapPingPreferences = {
  enabled: false,
};

export const defaultNotificationsSettings: NotificationsSettings = {
  ELITE2: {
    show: false,
    highlight: false,
    ignoreOtherWorlds: true,
    autoHideTimeout: 0,
    guildIds: [],
    sound: false,
  },
  HERO: {
    show: true,
    highlight: true,
    ignoreOtherWorlds: true,
    autoHideTimeout: 0,
    guildIds: [],
    sound: false,
  },
  COLOSSUS: {
    show: true,
    highlight: true,
    ignoreOtherWorlds: true,
    autoHideTimeout: 0,
    guildIds: [],
    sound: false,
  },
  TITAN: {
    show: true,
    highlight: true,
    ignoreOtherWorlds: true,
    autoHideTimeout: 0,
    guildIds: [],
    sound: false,
  },
  message: {
    show: true,
    highlight: true,
    ignoreOtherWorlds: true,
    autoHideTimeout: 0,
    guildIds: [],
    sound: false,
  },
  "party-gathering": {
    show: true,
    highlight: true,
    ignoreOtherWorlds: true,
    autoHideTimeout: 0,
    guildIds: [],
    sound: false,
  },
};

export const defaultDetectorSettings: DetectorSettings = {
  routingRules: [],
  ELITE2: {
    detect: false,
    autoSend: false,
    notifyWindow: false,
    highlight: false,
    notifySound: false,
  },
  HERO: {
    detect: true,
    autoSend: false,
    notifyWindow: true,
    highlight: true,
    notifySound: false,
  },
  COLOSSUS: {
    detect: true,
    autoSend: false,
    notifyWindow: true,
    highlight: true,
    notifySound: false,
  },
  TITAN: {
    detect: true,
    autoSend: false,
    notifyWindow: true,
    highlight: true,
    notifySound: false,
  },
};
