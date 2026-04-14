import type { NpcTypeEnum } from "./npc-type.types.js";

export type NpcType = `${NpcTypeEnum}`;

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
}

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

export interface MigrateTimerSettingsPayload {
  localData: Record<string, unknown>;
  conflictResolution?: "local" | "remote" | "merge";
}

export interface UpdateTimerSettingsPayload {
  generalConfig?: Partial<TimersGeneralConfig>;
  displayConfig?: Partial<TimersDisplayConfig>;
  customColors?: Record<string, CustomTimerColor>;
  timersColors?: Record<string, string | undefined>;
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
