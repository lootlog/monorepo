export type ThemePreviewScenario =
  | "dashboard"
  | "loots"
  | "components"
  | "states";

export type ThemePreviewViewport = "desktop" | "tablet" | "mobile";
export type ThemePreviewZoom = "fit" | "75" | "100";
export type ThemePreviewContext = "user" | "guild";
export type ThemePreviewNavigationKey =
  | "dashboard"
  | "battle-panel"
  | "notifications"
  | "settings"
  | "lootlog"
  | "timers"
  | "reservations"
  | "docs"
  | "events"
  | "stats"
  | "activity-logs"
  | "guild-notifications"
  | "guild-settings";

export interface ThemePreviewInspection {
  slot: string;
  tokens: string[];
}
