export type NpcType =
  | "COMMON"
  | "ELITE"
  | "ELITE2"
  | "ELITE3"
  | "HERO"
  | "EVENT_HERO"
  | "TITAN"
  | "COLOSSUS"
  | "NPC";

export interface TimersFilters {
  minLvl: number;
  maxLvl: number;
  selectedNpcTypes: NpcType[];
  selectedColors: string[];
}

export interface TimersGeneralConfig {
  removeTimerAfterMs: number;
  timersGrouping: boolean;
  timersUnderBag: boolean;
  countdownMode: "min" | "max";
  /** Legacy layout only: hides the title bar, filters and footer. */
  compactView: boolean;
}

export const TIMERS_LAYOUTS = ["legacy", "modern"] as const;

export type TimersLayout = (typeof TIMERS_LAYOUTS)[number];

export const DEFAULT_TIMERS_LAYOUT: TimersLayout = "modern";

export const TIMERS_MODERN_FONT_SCALE_MIN_PERCENT = 70;

export const TIMERS_MODERN_FONT_SCALE_MAX_PERCENT = 150;

export const TIMERS_MODERN_GAP_MIN_PX = 0;

export const TIMERS_MODERN_GAP_MAX_PX = 8;

export const TIMERS_MODERN_MIN_COLUMN_WIDTH_MIN_PX = 60;

export const TIMERS_MODERN_MIN_COLUMN_WIDTH_MAX_PX = 320;

export type TimersModernAppearancePreset = "comfortable" | "compact" | "custom";

/** Appearance of the modern timers layout; the legacy layout keeps `displayConfig`. */
export interface TimersModernAppearanceSettings {
  fontScalePercent: number;
  gapPx: number;
  minColumnWidth: number;
  showHeader: boolean;
  showFiltersBar: boolean;
  showFooter: boolean;
  showTypeBadge: boolean;
  showLevel: boolean;
}

export const TIMERS_MODERN_COMFORTABLE_PRESET = {
  fontScalePercent: 100,
  gapPx: 2,
  minColumnWidth: 220,
  showHeader: true,
  showFiltersBar: true,
  showFooter: true,
  showTypeBadge: true,
  showLevel: true,
} as const satisfies TimersModernAppearanceSettings;

export const TIMERS_MODERN_COMPACT_PRESET = {
  fontScalePercent: 90,
  gapPx: 1,
  minColumnWidth: 160,
  showHeader: true,
  showFiltersBar: false,
  showFooter: false,
  showTypeBadge: true,
  showLevel: false,
} as const satisfies TimersModernAppearanceSettings;

export interface TimersDisplayConfig {
  showType: boolean;
  showLevel: boolean;
  fontSize: number;
  minColumnWidth: number;
  singleTimerDisplayMode: "column" | "row";
}

export interface CustomTimerColor {
  id: string;
  name: string;
  borderColor: string;
  backgroundColor: string;
}

export interface UserTimerSettings {
  userId: string;
  generalConfig: TimersGeneralConfig;
  displayConfig: TimersDisplayConfig;
  customColors: Record<string, CustomTimerColor>;
  timersColors: Record<string, string | undefined>;
  alwaysVisibleExpiredTimers: Record<string, string[]>;
  defaultColorNames: Record<string, string>;
  overriddenDefaultColors: Record<
    string,
    { borderColor: string; backgroundColor: string }
  >;
  hiddenDefaultColors: string[];
  timerFiltersEnabled: boolean;
  colorFiltersEnabled: boolean;
  timersSortOrder: "asc" | "desc";
  syncEnabled: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserGuildTimerSettings {
  userId: string;
  guildId: string;
  hiddenTimers: string[];
  pinnedTimers: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UpdateTimerSettingsPayload {
  generalConfig?: Partial<TimersGeneralConfig>;
  displayConfig?: Partial<TimersDisplayConfig>;
  customColors?: Record<string, CustomTimerColor>;
  timersColors?: Record<string, string | undefined>;
  alwaysVisibleExpiredTimers?: Record<string, string[]>;
  defaultColorNames?: Record<string, string>;
  overriddenDefaultColors?: Record<
    string,
    { borderColor: string; backgroundColor: string }
  >;
  hiddenDefaultColors?: string[];
  timerFiltersEnabled?: boolean;
  colorFiltersEnabled?: boolean;
  timersSortOrder?: "asc" | "desc";
  syncEnabled?: boolean;
}

export interface UpdateGuildTimerSettingsPayload {
  hiddenTimers?: string[];
  pinnedTimers?: string[];
}
