import type { WindowId } from "@/store/windows.store";

export const MOBILE_PANEL_WINDOW_IDS = [
  "timers",
  "chat",
  "online-players",
  "hero-sightings",
  "party-finder",
  "create-party-gathering",
  "global-chat",
  "settings",
] as const satisfies readonly WindowId[];

export type MobilePanelWindowId = (typeof MOBILE_PANEL_WINDOW_IDS)[number];

const MOBILE_ALERT_WINDOW_IDS = [
  "npc-detector",
  "notifications",
  "loot-split",
  "battle-pings",
] as const satisfies readonly WindowId[];

export type MobileAlertWindowId = (typeof MOBILE_ALERT_WINDOW_IDS)[number];

const MOBILE_PROMPT_WINDOW_IDS = [
  "extension-login",
  "app-error",
  "backend-preferences-warning",
  "catching-whitelist-warning",
] as const satisfies readonly WindowId[];

const MOBILE_PANEL_WINDOW_SET = new Set<WindowId>(MOBILE_PANEL_WINDOW_IDS);

const MOBILE_ALERT_WINDOW_SET = new Set<WindowId>(MOBILE_ALERT_WINDOW_IDS);

const MOBILE_PROMPT_WINDOW_SET = new Set<WindowId>(MOBILE_PROMPT_WINDOW_IDS);

export const isMobilePanelWindowId = (
  id: WindowId,
): id is MobilePanelWindowId => MOBILE_PANEL_WINDOW_SET.has(id);

export const isMobileAlertWindowId = (
  id: WindowId,
): id is MobileAlertWindowId => MOBILE_ALERT_WINDOW_SET.has(id);

export const isMobilePromptWindowId = (id: WindowId): boolean =>
  MOBILE_PROMPT_WINDOW_SET.has(id);
