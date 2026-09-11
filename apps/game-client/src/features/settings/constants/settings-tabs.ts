export const SETTINGS_DOMAIN_VALUES = [
  "general",
  "servers",
  "appearance",
  "chat",
  "timers",
  "notifications",
  "battle-panel",
  "sounds",
  "controls",
  "experimental",
  "diagnostics",
  "information",
] as const;

export type SettingsDomainValue = (typeof SETTINGS_DOMAIN_VALUES)[number];

/** Tab ids persisted by earlier releases; they still resolve to a path. */
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

export type LegacySettingsTabValue =
  (typeof LEGACY_SETTINGS_TAB_VALUES)[number];

export type SettingsTabValue = SettingsDomainValue | LegacySettingsTabValue;

/**
 * Every subsection belongs to exactly one domain. Persisted paths may carry a
 * subsection under the domain that owned it in an earlier release, so the
 * owning domain is resolved from the subsection first.
 */
export const SETTINGS_SUBSECTION_DOMAINS = {
  visibility: "servers",
  catching: "general",
  behavior: "general",
  "npc-colors": "appearance",
  interface: "appearance",
  "chat-appearance": "chat",
  "chat-filters": "chat",
  "timer-behavior": "timers",
  "timer-appearance": "timers",
  "timer-colors": "timers",
  "hidden-timers": "timers",
  "notification-rules": "notifications",
  detector: "notifications",
  routing: "notifications",
  "notification-mutes": "notifications",
  sounds: "sounds",
  hotkeys: "controls",
  experimental: "experimental",
  "battle-panel": "battle-panel",
  logs: "diagnostics",
  debug: "diagnostics",
  build: "information",
} as const satisfies Record<string, SettingsDomainValue>;

// SAFETY: SETTINGS_SUBSECTION_DOMAINS is a closed literal object, so its keys
// are exactly the SettingsSubsectionValue union.
export const SETTINGS_SUBSECTION_VALUES = Object.keys(
  SETTINGS_SUBSECTION_DOMAINS,
) as readonly SettingsSubsectionValue[];

export type SettingsSubsectionValue = keyof typeof SETTINGS_SUBSECTION_DOMAINS;

export interface SettingsPath {
  domain: SettingsDomainValue;
  subsection: SettingsSubsectionValue;
}

const DEFAULT_SETTINGS_PATH: SettingsPath = {
  domain: "general",
  subsection: "catching",
};

const SETTINGS_PATHS: Record<SettingsTabValue, SettingsPath> = {
  general: DEFAULT_SETTINGS_PATH,
  servers: { domain: "servers", subsection: "visibility" },
  appearance: { domain: "appearance", subsection: "npc-colors" },
  chat: { domain: "chat", subsection: "chat-appearance" },
  timers: { domain: "timers", subsection: "timer-behavior" },
  notifications: {
    domain: "notifications",
    subsection: "notification-rules",
  },
  "battle-panel": { domain: "battle-panel", subsection: "battle-panel" },
  sounds: { domain: "sounds", subsection: "sounds" },
  controls: { domain: "controls", subsection: "hotkeys" },
  experimental: { domain: "experimental", subsection: "experimental" },
  diagnostics: { domain: "diagnostics", subsection: "logs" },
  information: { domain: "information", subsection: "build" },
  "game-data": { domain: "general", subsection: "catching" },
  catching: { domain: "general", subsection: "catching" },
  "hidden-timers": { domain: "timers", subsection: "hidden-timers" },
  "npc-detector": { domain: "notifications", subsection: "detector" },
  "notification-mutes": {
    domain: "notifications",
    subsection: "notification-mutes",
  },
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
