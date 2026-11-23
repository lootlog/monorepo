import { mapValues } from "es-toolkit";
import { recordKeys } from "@/utils/record-keys";

export const SETTINGS_DOMAIN_VALUES = [
  "general",
  "catching",
  "servers",
  "appearance",
  "chat",
  "timers",
  "notifications",
  "detector",
  "mutes",
  "battle-panel",
  "pings",
  "sounds",
  "controls",
  "diagnostics",
  "information",
] as const;

export type SettingsDomainValue = (typeof SETTINGS_DOMAIN_VALUES)[number];

export const LEGACY_SETTINGS_TAB_VALUES = [
  "game-data",
  "catching",
  "hidden-timers",
  "npc-detector",
  "notification-mutes",
  "hotkeys",
  "logs",
  "debug",
] as const;

type LegacySettingsTabValue = (typeof LEGACY_SETTINGS_TAB_VALUES)[number];

export type SettingsTabValue = SettingsDomainValue | LegacySettingsTabValue;

export const SETTINGS_SUBSECTION_DOMAINS = {
  visibility: "servers",
  catching: "catching",
  behavior: "general",
  "npc-colors": "appearance",
  "character-aura": "appearance",
  "chat-appearance": "chat",
  "chat-filters": "chat",
  "timer-behavior": "timers",
  "timer-appearance": "timers",
  "timer-colors": "timers",
  "timer-lists": "timers",
  "hidden-timers": "timers",
  "notification-rules": "notifications",
  detector: "detector",
  "muted-players": "mutes",
  "muted-npcs": "mutes",
  sounds: "sounds",
  hotkeys: "controls",
  "battle-panel": "battle-panel",
  pings: "pings",
  logs: "diagnostics",
  debug: "diagnostics",
  "whats-new": "information",
  build: "information",
} as const satisfies Record<string, SettingsDomainValue>;

export const SETTINGS_SUBSECTION_VALUES: readonly SettingsSubsectionValue[] =
  recordKeys(SETTINGS_SUBSECTION_DOMAINS);

export type SettingsSubsectionValue = keyof typeof SETTINGS_SUBSECTION_DOMAINS;

export interface SettingsPath {
  domain: SettingsDomainValue;
  subsection: SettingsSubsectionValue;
}

const DEFAULT_SETTINGS_PATH: SettingsPath = {
  domain: "general",
  subsection: "behavior",
};

export const SETTINGS_DOMAIN_FIRST_SUBSECTIONS = {
  general: "behavior",
  catching: "catching",
  servers: "visibility",
  appearance: "npc-colors",
  chat: "chat-appearance",
  timers: "timer-behavior",
  notifications: "notification-rules",
  detector: "detector",
  mutes: "muted-players",
  "battle-panel": "battle-panel",
  pings: "pings",
  sounds: "sounds",
  controls: "hotkeys",
  diagnostics: "logs",
  information: "whats-new",
} as const satisfies Record<SettingsDomainValue, SettingsSubsectionValue>;

const SETTINGS_PATHS: Record<SettingsTabValue, SettingsPath> = {
  ...mapValues(
    SETTINGS_DOMAIN_FIRST_SUBSECTIONS,
    (subsection, domain): SettingsPath => ({ domain, subsection }),
  ),
  "game-data": { domain: "catching", subsection: "catching" },
  "hidden-timers": { domain: "timers", subsection: "hidden-timers" },
  "npc-detector": { domain: "detector", subsection: "detector" },
  "notification-mutes": { domain: "mutes", subsection: "muted-players" },
  hotkeys: { domain: "controls", subsection: "hotkeys" },
  logs: { domain: "diagnostics", subsection: "logs" },
  debug: { domain: "diagnostics", subsection: "debug" },
};

export const resolveSettingsPath = (
  activeTab?: SettingsTabValue,
  activeSubsection?: SettingsSubsectionValue,
): SettingsPath => {
  if (activeSubsection) {
    return {
      domain: SETTINGS_SUBSECTION_DOMAINS[activeSubsection],
      subsection: activeSubsection,
    };
  }

  return activeTab ? SETTINGS_PATHS[activeTab] : DEFAULT_SETTINGS_PATH;
};
