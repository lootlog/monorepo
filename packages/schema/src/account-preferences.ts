export const NOTIFICATION_TYPES = [
  "ELITE2",
  "HERO",
  "COLOSSUS",
  "TITAN",
  "message",
  "party-gathering",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type DetectorNpcType = "ELITE2" | "HERO" | "COLOSSUS" | "TITAN";

export const DETECTOR_NPC_TYPES = [
  "ELITE2",
  "HERO",
  "COLOSSUS",
  "TITAN",
] as const satisfies readonly DetectorNpcType[];

export const isDetectorNpcType = (value: string): value is DetectorNpcType =>
  DETECTOR_NPC_TYPES.some((type) => type === value);

export interface NotificationSettings {
  show: boolean;
  highlight: boolean;
  ignoreOtherWorlds: boolean;
  autoHideTimeout?: number;
  sound: boolean;
}

/**
 * One notification rule per type plus the single list of Organizations the
 * player receives notifications from. The list is shared by every type since
 * `notifications` document schema version 2.
 */
export type NotificationsSettings = Record<
  NotificationType,
  NotificationSettings
> & {
  guildIds: string[];
};

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

export interface AirTagPreferences {
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
  airTags: AirTagPreferences;
  hasStoredNotifications: boolean;
  hasStoredDetector: boolean;
  hasStoredPings: boolean;
  hasStoredAirTags: boolean;
  hasStoredPreferences: boolean;
}

export type NotificationsSettingsPatch = Partial<
  Record<NotificationType, Partial<NotificationSettings>>
> & {
  guildIds?: string[];
};

export interface UpdateUserGameAccountPreferencesPayload {
  notifications?: NotificationsSettingsPatch;
  detector?: DetectorSettingsPatch;
  pings?: Partial<MapPingPreferences>;
  airTags?: Partial<AirTagPreferences>;
}

export const defaultMapPingPreferences: MapPingPreferences = {
  enabled: false,
};

export const defaultAirTagPreferences: AirTagPreferences = {
  enabled: false,
};

export const defaultNotificationsSettings: NotificationsSettings = {
  guildIds: [],
  ELITE2: {
    show: false,
    highlight: false,
    ignoreOtherWorlds: true,
    autoHideTimeout: 0,
    sound: false,
  },
  HERO: {
    show: true,
    highlight: true,
    ignoreOtherWorlds: true,
    autoHideTimeout: 0,
    sound: false,
  },
  COLOSSUS: {
    show: true,
    highlight: true,
    ignoreOtherWorlds: true,
    autoHideTimeout: 0,
    sound: false,
  },
  TITAN: {
    show: true,
    highlight: true,
    ignoreOtherWorlds: true,
    autoHideTimeout: 0,
    sound: false,
  },
  message: {
    show: true,
    highlight: true,
    ignoreOtherWorlds: true,
    autoHideTimeout: 0,
    sound: false,
  },
  "party-gathering": {
    show: true,
    highlight: true,
    ignoreOtherWorlds: true,
    autoHideTimeout: 0,
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

export const getDetectorNpcSettings = (
  settings: DetectorSettings,
  npcType: string,
) => (isDetectorNpcType(npcType) ? settings[npcType] : undefined);
