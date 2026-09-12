import { isRecord } from "@lootlog/schema/records";
import {
  TIMERS_MODERN_COMFORTABLE_PRESET,
  TIMERS_MODERN_COMPACT_PRESET,
  TIMERS_MODERN_FONT_SCALE_MAX_PERCENT,
  TIMERS_MODERN_FONT_SCALE_MIN_PERCENT,
  TIMERS_MODERN_GAP_MAX_PX,
  TIMERS_MODERN_GAP_MIN_PX,
  TIMERS_MODERN_MIN_COLUMN_WIDTH_MAX_PX,
  TIMERS_MODERN_MIN_COLUMN_WIDTH_MIN_PX,
  type TimersModernAppearancePreset,
  type TimersModernAppearanceSettings,
} from "@lootlog/schema/timer-settings";

const normalizeNumber = (
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(maximum, Math.max(minimum, value));
};

const normalizeBoolean = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;

const BOOLEAN_KEYS = [
  "showHeader",
  "showFiltersBar",
  "showFooter",
  "showTypeBadge",
  "showLevel",
] as const;

export const normalizeTimersModernAppearance = (
  value: unknown,
  fallback: TimersModernAppearanceSettings = TIMERS_MODERN_COMFORTABLE_PRESET,
): TimersModernAppearanceSettings => {
  const settings = isRecord(value) ? value : {};

  const normalized: TimersModernAppearanceSettings = {
    fontScalePercent: normalizeNumber(
      settings.fontScalePercent,
      fallback.fontScalePercent,
      TIMERS_MODERN_FONT_SCALE_MIN_PERCENT,
      TIMERS_MODERN_FONT_SCALE_MAX_PERCENT,
    ),
    gapPx: normalizeNumber(
      settings.gapPx,
      fallback.gapPx,
      TIMERS_MODERN_GAP_MIN_PX,
      TIMERS_MODERN_GAP_MAX_PX,
    ),
    minColumnWidth: normalizeNumber(
      settings.minColumnWidth,
      fallback.minColumnWidth,
      TIMERS_MODERN_MIN_COLUMN_WIDTH_MIN_PX,
      TIMERS_MODERN_MIN_COLUMN_WIDTH_MAX_PX,
    ),
    showHeader: fallback.showHeader,
    showFiltersBar: fallback.showFiltersBar,
    showFooter: fallback.showFooter,
    showTypeBadge: fallback.showTypeBadge,
    showLevel: fallback.showLevel,
  };

  for (const key of BOOLEAN_KEYS) {
    normalized[key] = normalizeBoolean(settings[key], fallback[key]);
  }

  return normalized;
};

export const mergeTimersModernAppearance = (
  currentSettings: unknown,
  patch: Partial<TimersModernAppearanceSettings>,
) => {
  const normalizedCurrent = normalizeTimersModernAppearance(currentSettings);

  return normalizeTimersModernAppearance(
    { ...normalizedCurrent, ...patch },
    normalizedCurrent,
  );
};

const timersModernAppearanceEqual = (
  left: TimersModernAppearanceSettings,
  right: TimersModernAppearanceSettings,
) =>
  left.fontScalePercent === right.fontScalePercent &&
  left.gapPx === right.gapPx &&
  left.minColumnWidth === right.minColumnWidth &&
  BOOLEAN_KEYS.every((key) => left[key] === right[key]);

export const getTimersModernAppearancePreset = (
  value: unknown,
): TimersModernAppearancePreset => {
  const settings = normalizeTimersModernAppearance(value);

  if (timersModernAppearanceEqual(settings, TIMERS_MODERN_COMFORTABLE_PRESET)) {
    return "comfortable";
  }

  if (timersModernAppearanceEqual(settings, TIMERS_MODERN_COMPACT_PRESET)) {
    return "compact";
  }

  return "custom";
};
