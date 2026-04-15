export const SETTINGS_TAB_VALUES = [
  "general",
  "timers",
  "catching",
  "hidden-timers",
  "npc-detector",
  "notifications",
  "sounds",
  "battle-panel",
  "hotkeys",
  "debug",
] as const;

export type SettingsTabValue = (typeof SETTINGS_TAB_VALUES)[number];
