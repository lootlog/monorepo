import { SETTINGS_MANIFEST } from "../settings-manifest";

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

type LegacySettingsTabValue = (typeof LEGACY_SETTINGS_TAB_VALUES)[number];

export type SettingsTabValue = SettingsDomainValue | LegacySettingsTabValue;

/**
 * Every subsection belongs to exactly one domain. Persisted paths may carry a
 * subsection under the domain that owned it in an earlier release, so the
 * owning domain is resolved from the subsection first.
 */
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
  subsection: "behavior",
};

/**
 * A domain opens on its first subsection; tab ids persisted by earlier
 * releases keep the destinations they had when they were retired.
 */
const SETTINGS_PATHS: Record<SettingsTabValue, SettingsPath> = {
  // SAFETY: the manifest declares every domain exactly once, which
  // settings-manifest.test.ts checks against SETTINGS_DOMAIN_VALUES.
  ...(Object.fromEntries(
    SETTINGS_MANIFEST.map(({ id, subsections: [first] }) => [
      id,
      { domain: id, subsection: first.id },
    ]),
  ) as Record<SettingsDomainValue, SettingsPath>),
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
