import type { CSSProperties } from "react";
import type { TimersModernAppearanceSettings } from "@lootlog/schema/timer-settings";

export type TimersDensityStyle = CSSProperties & {
  "--ll-timers-font-size": string;
  "--ll-timers-badge-font-size": string;
  "--ll-timers-line-height": string;
  "--ll-timers-row-min-height": string;
  "--ll-timers-avatar-height": string;
  "--ll-timers-avatar-width": string;
  "--ll-timers-gap": string;
  "--ll-timers-min-column": string;
  "--ll-timers-space-xs": string;
  "--ll-timers-space-sm": string;
  "--ll-timers-space-md": string;
};

const formatScaledPixels = (pixels: number, scale: number) =>
  `${Math.round(pixels * scale * 100) / 100}px`;

/** Geometry of the modern timers layout as CSS variables, computed once per surface. */
export const getTimersDensityStyle = ({
  fontScalePercent,
  gapPx,
  minColumnWidth,
}: Pick<
  TimersModernAppearanceSettings,
  "fontScalePercent" | "gapPx" | "minColumnWidth"
>): TimersDensityStyle => {
  const scale = fontScalePercent / 100;

  return {
    "--ll-timers-font-size": formatScaledPixels(12, scale),
    "--ll-timers-badge-font-size": formatScaledPixels(10, scale),
    "--ll-timers-line-height": formatScaledPixels(16, scale),
    "--ll-timers-row-min-height": formatScaledPixels(22, scale),
    "--ll-timers-avatar-height": formatScaledPixels(22, scale),
    "--ll-timers-avatar-width": formatScaledPixels(18, scale),
    "--ll-timers-gap": `${gapPx}px`,
    "--ll-timers-min-column": `${minColumnWidth}px`,
    "--ll-timers-space-xs": formatScaledPixels(2, scale),
    "--ll-timers-space-sm": formatScaledPixels(4, scale),
    "--ll-timers-space-md": formatScaledPixels(6, scale),
  };
};
