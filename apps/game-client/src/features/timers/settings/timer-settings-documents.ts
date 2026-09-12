/* oxlint-disable anti-slop/no-unsafe-dictionary-type, anti-slop/no-unknown-parameters, anti-slop/no-unknown-returns, anti-slop/no-runtime-typeof, anti-slop/no-known-value-widening -- timer settings read and write catalog-validated document JSON; values are typed by the normalizers before they reach the feature. */
import type {
  CustomTimerColor,
  TimersDisplayConfig,
  TimersGeneralConfig,
  TimersLayout,
  TimersModernAppearanceSettings,
} from "@lootlog/schema/timer-settings";
import { normalizeTimersModernAppearance } from "@lootlog/domain/timers-modern-appearance";
import {
  getSettingsDefaultValue,
  selectSettingsValue,
  type SettingsDocuments,
} from "@/features/settings/persistence/settings-documents";
import type { OverriddenTimerColor } from "@/features/timers/model/timer-colors";
import {
  timerDisplayConfigSchema,
  timerGeneralConfigSchema,
} from "./legacy-timer-snapshot";

/** Settings key of the hidden/pinned lists shared by every organization when timers are grouped. */
export const GLOBAL_TIMER_SETTINGS_KEY = "global";

export type TimerBehaviorSettings = {
  generalConfig: TimersGeneralConfig;
  layout: TimersLayout;
  alwaysVisibleExpiredTimers: Record<string, string[]>;
  timerFiltersEnabled: boolean;
  colorFiltersEnabled: boolean;
  timersSortOrder: "asc" | "desc";
};

export type TimerAppearanceSettings = {
  displayConfig: TimersDisplayConfig;
  modern: TimersModernAppearanceSettings;
  timersColors: Record<string, string>;
  customColors: Record<string, CustomTimerColor>;
  defaultColorNames: Record<string, string>;
  overriddenDefaultColors: Record<string, OverriddenTimerColor>;
  hiddenDefaultColors: string[];
};

export type GuildTimerLists = {
  hiddenTimers: string[];
  pinnedTimers: string[];
};

const DEFAULT_GENERAL_CONFIG: TimersGeneralConfig = {
  removeTimerAfterMs: 30_000,
  timersGrouping: false,
  timersUnderBag: false,
  countdownMode: "max",
  compactView: false,
  ...timerGeneralConfigSchema.parse(
    getSettingsDefaultValue("timers.generalConfig"),
  ),
};

const DEFAULT_DISPLAY_CONFIG: TimersDisplayConfig = {
  showType: true,
  showLevel: false,
  fontSize: 11,
  minColumnWidth: 120,
  singleTimerDisplayMode: "row",
  ...timerDisplayConfigSchema.parse(
    getSettingsDefaultValue("appearance.timers.displayConfig"),
  ),
};

/** The server validates these records only as records; leaf types are checked here. */
export const normalizeTimerGeneralConfig = (
  value: unknown,
): TimersGeneralConfig => {
  const parsed = timerGeneralConfigSchema.safeParse(value);

  return parsed.success
    ? { ...DEFAULT_GENERAL_CONFIG, ...parsed.data }
    : DEFAULT_GENERAL_CONFIG;
};

export const normalizeTimerDisplayConfig = (
  value: unknown,
): TimersDisplayConfig => {
  const parsed = timerDisplayConfigSchema.safeParse(value);

  return parsed.success
    ? { ...DEFAULT_DISPLAY_CONFIG, ...parsed.data }
    : DEFAULT_DISPLAY_CONFIG;
};

const behaviorCache = new WeakMap<SettingsDocuments, TimerBehaviorSettings>();

const appearanceCache = new WeakMap<
  SettingsDocuments,
  TimerAppearanceSettings
>();

const guildListsCache = new WeakMap<SettingsDocuments, GuildTimerLists>();

const buildBehavior = (
  documents: SettingsDocuments | undefined,
): TimerBehaviorSettings => ({
  generalConfig: normalizeTimerGeneralConfig(
    selectSettingsValue(documents, "timers.generalConfig"),
  ),
  layout: selectSettingsValue(documents, "timers.layout"),
  alwaysVisibleExpiredTimers: selectSettingsValue(
    documents,
    "timers.alwaysVisibleExpiredTimers",
  ),
  timerFiltersEnabled: selectSettingsValue(
    documents,
    "timers.timerFiltersEnabled",
  ),
  colorFiltersEnabled: selectSettingsValue(
    documents,
    "timers.colorFiltersEnabled",
  ),
  timersSortOrder:
    selectSettingsValue(documents, "timers.timersSortOrder") === "desc"
      ? "desc"
      : "asc",
});

const buildAppearance = (
  documents: SettingsDocuments | undefined,
): TimerAppearanceSettings => ({
  displayConfig: normalizeTimerDisplayConfig(
    selectSettingsValue(documents, "appearance.timers.displayConfig"),
  ),
  modern: normalizeTimersModernAppearance(
    selectSettingsValue(documents, "appearance.timers.modern"),
  ),
  timersColors: selectSettingsValue(
    documents,
    "appearance.timers.timersColors",
  ),
  customColors: selectSettingsValue(
    documents,
    "appearance.timers.customColors",
  ),
  defaultColorNames: selectSettingsValue(
    documents,
    "appearance.timers.defaultColorNames",
  ),
  overriddenDefaultColors: selectSettingsValue(
    documents,
    "appearance.timers.overriddenDefaultColors",
  ),
  hiddenDefaultColors: selectSettingsValue(
    documents,
    "appearance.timers.hiddenDefaultColors",
  ),
});

const buildGuildLists = (
  documents: SettingsDocuments | undefined,
): GuildTimerLists => ({
  hiddenTimers: selectSettingsValue(documents, "timers.hiddenTimers"),
  pinnedTimers: selectSettingsValue(documents, "timers.pinnedTimers"),
});

const DEFAULT_BEHAVIOR = buildBehavior(undefined);

const DEFAULT_APPEARANCE = buildAppearance(undefined);

const DEFAULT_GUILD_LISTS = buildGuildLists(undefined);

const cached = <TValue>(
  cache: WeakMap<SettingsDocuments, TValue>,
  documents: SettingsDocuments | undefined,
  fallback: TValue,
  build: (documents: SettingsDocuments) => TValue,
): TValue => {
  if (!documents) return fallback;
  const hit = cache.get(documents);

  if (hit) return hit;
  const value = build(documents);
  cache.set(documents, value);

  return value;
};

/** Behaviour settings from the user documents; the same documents give the same object. */
export const getTimerBehaviorFromDocuments = (
  documents: SettingsDocuments | undefined,
) => cached(behaviorCache, documents, DEFAULT_BEHAVIOR, buildBehavior);

export const getTimerAppearanceFromDocuments = (
  documents: SettingsDocuments | undefined,
) => cached(appearanceCache, documents, DEFAULT_APPEARANCE, buildAppearance);

/** Hidden and pinned lists of one document: the user's (grouped) or one organization's. */
export const getGuildTimerListsFromDocuments = (
  documents: SettingsDocuments | undefined,
) => cached(guildListsCache, documents, DEFAULT_GUILD_LISTS, buildGuildLists);
