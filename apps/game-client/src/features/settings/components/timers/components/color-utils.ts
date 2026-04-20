export { getDefaultColorName } from "@/features/timers/utils/get-default-color-name";

export const TAILWIND_TO_HEX: Record<
  string,
  { border: string; background: string }
> = {
  red: { border: "#ef4444", background: "#ef444433" },
  orange: { border: "#f97316", background: "#f9731633" },
  yellow: { border: "#eab308", background: "#eab30833" },
  lime: { border: "#84cc16", background: "#84cc1633" },
  green: { border: "#22c55e", background: "#22c55e33" },
  teal: { border: "#14b8a6", background: "#14b8a633" },
  sky: { border: "#0ea5e9", background: "#0ea5e933" },
  blue: { border: "#3730a3", background: "#3730a333" },
  violet: { border: "#a78bfa", background: "#a78bfa33" },
  purple: { border: "#9333ea", background: "#9333ea33" },
  pink: { border: "#ec4899", background: "#ec489933" },
  white: { border: "#9ca3af", background: "#9ca3af33" },
};

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
