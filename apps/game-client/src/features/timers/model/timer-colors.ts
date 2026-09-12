import type { CSSProperties } from "react";
import type { CustomTimerColor } from "@lootlog/schema/timer-settings";
import { getFixedT } from "@/i18n/get-fixed-t";

type TimerColorDefinition = {
  /** Tinted background with a stronger hover, for tiles. */
  bg: string;
  /** Solid swatch background, for pickers and chips. */
  bgNoOpacity: string;
  border: string;
  hex: { border: string; background: string };
};

/** Palette of the built-in timer colours: Tailwind classes plus the matching hex values. */
export const TIMERS_COLORS = {
  red: {
    bg: "ll:bg-red-500/20 ll:hover:bg-red-500/40",
    bgNoOpacity: "ll:bg-red-500",
    border: "ll:border-red-500",
    hex: { border: "#ef4444", background: "#ef444433" },
  },
  orange: {
    bg: "ll:bg-orange-500/20 ll:hover:bg-orange-500/40",
    bgNoOpacity: "ll:bg-orange-500",
    border: "ll:border-orange-500",
    hex: { border: "#f97316", background: "#f9731633" },
  },
  yellow: {
    bg: "ll:bg-yellow-500/20 ll:hover:bg-yellow-500/40",
    bgNoOpacity: "ll:bg-yellow-500",
    border: "ll:border-yellow-500",
    hex: { border: "#eab308", background: "#eab30833" },
  },
  lime: {
    bg: "ll:bg-lime-500/20 ll:hover:bg-lime-500/40",
    bgNoOpacity: "ll:bg-lime-500",
    border: "ll:border-lime-500",
    hex: { border: "#84cc16", background: "#84cc1633" },
  },
  green: {
    bg: "ll:bg-green-500/20 ll:hover:bg-green-500/40",
    bgNoOpacity: "ll:bg-green-500",
    border: "ll:border-green-500",
    hex: { border: "#22c55e", background: "#22c55e33" },
  },
  teal: {
    bg: "ll:bg-teal-500/20 ll:hover:bg-teal-500/40",
    bgNoOpacity: "ll:bg-teal-500",
    border: "ll:border-teal-500",
    hex: { border: "#14b8a6", background: "#14b8a633" },
  },
  sky: {
    bg: "ll:bg-sky-500/20 ll:hover:bg-sky-500/40",
    bgNoOpacity: "ll:bg-sky-500",
    border: "ll:border-sky-500",
    hex: { border: "#0ea5e9", background: "#0ea5e933" },
  },
  blue: {
    bg: "ll:bg-indigo-800/20 ll:hover:bg-indigo-800/40",
    bgNoOpacity: "ll:bg-indigo-800",
    border: "ll:border-indigo-800",
    hex: { border: "#3730a3", background: "#3730a333" },
  },
  violet: {
    bg: "ll:bg-violet-400/20 ll:hover:bg-violet-400/40",
    bgNoOpacity: "ll:bg-violet-400",
    border: "ll:border-violet-400",
    hex: { border: "#a78bfa", background: "#a78bfa33" },
  },
  purple: {
    bg: "ll:bg-purple-600/20 ll:hover:bg-purple-600/40",
    bgNoOpacity: "ll:bg-purple-600",
    border: "ll:border-purple-600",
    hex: { border: "#9333ea", background: "#9333ea33" },
  },
  pink: {
    bg: "ll:bg-pink-500/20 ll:hover:bg-pink-500/40",
    bgNoOpacity: "ll:bg-pink-500",
    border: "ll:border-pink-500",
    hex: { border: "#ec4899", background: "#ec489933" },
  },
  white: {
    bg: "ll:bg-gray-400/20 ll:hover:bg-gray-400/40",
    bgNoOpacity: "ll:bg-gray-400",
    border: "ll:border-gray-400",
    hex: { border: "#9ca3af", background: "#9ca3af33" },
  },
} satisfies Record<string, TimerColorDefinition>;

export type TimerColorId = keyof typeof TIMERS_COLORS;

export const DEFAULT_TIMER_COLOR_ID: TimerColorId = "white";

export const isTimerColor = (color: string): color is TimerColorId =>
  Object.hasOwn(TIMERS_COLORS, color);

export const getTimerColor = (color: string) =>
  isTimerColor(color) ? TIMERS_COLORS[color] : undefined;

export const getTimerColorHex = (color: string) => getTimerColor(color)?.hex;

export const getDefaultColorName = (colorId: string) => {
  const t = getFixedT("timers");

  return t(`colorNames.${colorId}`, { defaultValue: colorId });
};

export type OverriddenTimerColor = {
  borderColor: string;
  backgroundColor: string;
};

export type TimerColorConfig = {
  selectedColor: string;
  customColor: CustomTimerColor | undefined;
  overriddenColor: OverriddenTimerColor | undefined;
};

/** The colour assigned to an NPC name and, when it is not a stock palette entry, its custom or overridden values. */
export const getTimerColorConfig = (
  npcName: string,
  timersColors: Record<string, string | undefined>,
  customColors: Record<string, CustomTimerColor>,
  overriddenDefaultColors: Record<string, OverriddenTimerColor>,
): TimerColorConfig => {
  const selectedColor = timersColors[npcName] ?? DEFAULT_TIMER_COLOR_ID;

  return {
    selectedColor,
    customColor: customColors[selectedColor],
    overriddenColor: overriddenDefaultColors[selectedColor],
  };
};

const HEX_RGB_LENGTH = 6;

const HEX_RGBA_LENGTH = 8;

/** Lightens a `#rrggbb` or `#rrggbbaa` colour by a percentage, keeping the alpha channel. */
export const brightenHexColor = (color: string, percent: number): string => {
  const hex = color.replace("#", "");
  const hasAlpha = hex.length === HEX_RGBA_LENGTH;
  const rgb = hasAlpha ? hex.slice(0, HEX_RGB_LENGTH) : hex;
  const alpha = hasAlpha ? hex.slice(HEX_RGB_LENGTH, HEX_RGBA_LENGTH) : "";
  const value = Number.parseInt(rgb, 16);
  const delta = Math.round(2.55 * percent);

  const clampChannel = (channel: number) =>
    Math.min(255, Math.max(0, channel + delta));

  const red = clampChannel(value >> 16);
  const green = clampChannel((value >> 8) & 0xff);
  const blue = clampChannel(value & 0xff);

  const next = ((red << 16) | (green << 8) | blue)
    .toString(16)
    .padStart(HEX_RGB_LENGTH, "0");

  return `#${next}${alpha}`;
};

const HOVER_BRIGHTNESS_PERCENT = 20;

/** The solid hex of the assigned colour, for a small accent; nothing for the default. */
export const resolveTimerAccentColor = ({
  selectedColor,
  customColor,
  overriddenColor,
}: TimerColorConfig): string | undefined => {
  const explicit = customColor ?? overriddenColor;

  if (explicit) return explicit.borderColor;

  return selectedColor === DEFAULT_TIMER_COLOR_ID
    ? undefined
    : getTimerColorHex(selectedColor)?.border;
};

/**
 * Background-only variant for borderless rows: the palette tint (with its
 * hover) for stock colours, the custom or overridden background inline
 * otherwise. The default colour paints nothing so plain rows stay flat.
 */
export const resolveTimerRowColors = ({
  selectedColor,
  customColor,
  overriddenColor,
}: TimerColorConfig): TimerTileColors => {
  const explicit = customColor ?? overriddenColor;

  if (explicit) {
    const style: CSSProperties & Record<`--${string}`, string> = {
      backgroundColor: explicit.backgroundColor,
      "--ll-tile-bg-hover": brightenHexColor(
        explicit.backgroundColor,
        HOVER_BRIGHTNESS_PERCENT,
      ),
    };

    return { style };
  }

  if (selectedColor === DEFAULT_TIMER_COLOR_ID) return {};
  const stock = getTimerColor(selectedColor);

  return stock ? { className: stock.bg } : {};
};

export type TimerTileColors = {
  /** Palette classes when the colour is a stock entry without overrides. */
  className?: string;
  /** Inline colours for custom and overridden entries; hover uses the variable. */
  style?: CSSProperties;
};

/**
 * Maps a colour config to what a tile can paint: stock colours keep their
 * Tailwind classes; custom or overridden colours become inline values plus a
 * precomputed hover background exposed as `--ll-tile-bg-hover`.
 */
export const resolveTimerTileColors = ({
  selectedColor,
  customColor,
  overriddenColor,
}: TimerColorConfig): TimerTileColors => {
  const explicit = customColor ?? overriddenColor;

  if (explicit) {
    const style: CSSProperties & Record<`--${string}`, string> = {
      borderColor: explicit.borderColor,
      backgroundColor: explicit.backgroundColor,
      "--ll-tile-bg-hover": brightenHexColor(
        explicit.backgroundColor,
        HOVER_BRIGHTNESS_PERCENT,
      ),
    };

    return { style };
  }

  const stock = getTimerColor(selectedColor);

  return stock ? { className: `${stock.bg} ${stock.border}` } : {};
};
