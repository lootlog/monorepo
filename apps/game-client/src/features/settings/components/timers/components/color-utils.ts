import {
  isTimerColor,
  type TIMERS_COLORS,
} from "@/features/timers/constants/timer-colors";

const TAILWIND_TO_HEX = {
  red: { border: "#ef4444", background: "#ef444499" },
  orange: { border: "#f97316", background: "#f9731699" },
  yellow: { border: "#eab308", background: "#eab30899" },
  lime: { border: "#84cc16", background: "#84cc1699" },
  green: { border: "#22c55e", background: "#22c55e99" },
  teal: { border: "#14b8a6", background: "#14b8a699" },
  sky: { border: "#0ea5e9", background: "#0ea5e999" },
  blue: { border: "#3730a3", background: "#3730a399" },
  violet: { border: "#a78bfa", background: "#a78bfa99" },
  purple: { border: "#9333ea", background: "#9333ea99" },
  pink: { border: "#ec4899", background: "#ec489999" },
  white: { border: "#9ca3af", background: "#9ca3af00" },
} satisfies Record<
  keyof typeof TIMERS_COLORS,
  { border: string; background: string }
>;

export const getTimerColorHex = (color: string) =>
  isTimerColor(color) ? TAILWIND_TO_HEX[color] : undefined;

export const stripAlphaChannel = (color: string): string => {
  const hex = color.replace("#", "");

  return hex.length === 8 ? `#${hex.slice(0, 6)}` : color;
};

export const alphaToHex = (alpha: number): string => {
  const value = Math.round((alpha / 100) * 255);

  return value.toString(16).padStart(2, "0");
};

export const hexToAlpha = (color: string): number => {
  const hex = color.replace("#", "");

  if (hex.length === 8) {
    const alphaHex = hex.slice(6, 8);
    const alphaValue = Number.parseInt(alphaHex, 16);

    return Math.round((alphaValue / 255) * 100);
  }

  return 20;
};

export interface ColorEditData {
  name: string;
  borderColor: string;
  backgroundColor: string;
  backgroundAlpha: number;
}
