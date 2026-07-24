export const SETTINGS_DOMAIN_VALUES = [
  "general",
  "appearance",
  "timers",
  "game-data",
  "notifications",
  "controls",
  "diagnostics",
  "information",
] as const;

export type SettingsDomainValue = (typeof SETTINGS_DOMAIN_VALUES)[number];

export const LEGACY_SETTINGS_TAB_VALUES = [
  "catching",
  "hidden-timers",
  "npc-detector",
  "notification-mutes",
  "sounds",
  "battle-panel",
  "hotkeys",
  "logs",
  "debug",
] as const;

export type LegacySettingsTabValue =
  (typeof LEGACY_SETTINGS_TAB_VALUES)[number];

export type SettingsTabValue = SettingsDomainValue | LegacySettingsTabValue;

export type SettingsSubsectionValue =
  | "behavior"
  | "chat"
  | "timer-appearance"
  | "timer-colors"
  | "timer-behavior"
  | "hidden-timers"
  | "catching"
  | "detector"
  | "battle-panel"
  | "notification-rules"
  | "notification-mutes"
  | "sounds"
  | "hotkeys"
  | "logs"
  | "debug"
  | "build";

export interface SettingsPath {
  domain: SettingsDomainValue;
  subsection: SettingsSubsectionValue;
}

const DEFAULT_SETTINGS_PATH: SettingsPath = {
  domain: "general",
  subsection: "behavior",
};

const SETTINGS_PATHS: Record<SettingsTabValue, SettingsPath> = {
  general: DEFAULT_SETTINGS_PATH,
  appearance: { domain: "appearance", subsection: "chat" },
  timers: { domain: "timers", subsection: "timer-behavior" },
  "game-data": { domain: "game-data", subsection: "catching" },
  notifications: {
    domain: "notifications",
    subsection: "notification-rules",
  },
  controls: { domain: "controls", subsection: "hotkeys" },
  diagnostics: { domain: "diagnostics", subsection: "logs" },
  information: { domain: "information", subsection: "build" },
  catching: { domain: "game-data", subsection: "catching" },
  "hidden-timers": { domain: "timers", subsection: "hidden-timers" },
  "npc-detector": { domain: "game-data", subsection: "detector" },
  "notification-mutes": {
    domain: "notifications",
    subsection: "notification-mutes",
  },
  sounds: { domain: "notifications", subsection: "sounds" },
  "battle-panel": { domain: "game-data", subsection: "battle-panel" },
  hotkeys: { domain: "controls", subsection: "hotkeys" },
  logs: { domain: "diagnostics", subsection: "logs" },
  debug: { domain: "diagnostics", subsection: "debug" },
};

export const resolveSettingsPath = (
  activeTab?: SettingsTabValue,
  activeSubsection?: SettingsSubsectionValue,
): SettingsPath => {
  const basePath = activeTab
    ? SETTINGS_PATHS[activeTab]
    : DEFAULT_SETTINGS_PATH;

  return {
    domain: basePath.domain,
    subsection: activeSubsection ?? basePath.subsection,
  };
};
