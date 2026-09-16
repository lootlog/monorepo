import { cn } from "cn";
import type { CSSProperties, FC } from "react";
import {
  isUnpaintedTimerColor,
  type TimerColorPaint,
} from "@/features/timers/constants/timer-colors";

export type TimerTileViewProps = {
  paint: TimerColorPaint;
  legacyAppearance?: boolean;
  displayMode: "column" | "row";
  fontSize: number;
  hasPassedRedThreshold?: boolean;
  isExpired?: boolean;
  id?: string;
  /**
   * Every other grid row of unpainted tiles (no colour, or expired) gets a
   * lighter fill so neighbouring records stay apart; coloured tiles keep
   * their own fill so a colour reads the same on every row.
   */
  isAlternateRow?: boolean;
  isMinSpawnTime?: boolean;
  isPending?: boolean;
  label: string;
  timeLabel: string;
};

const EXPIRED_FILL = "rgba(255, 255, 255, 0.04)";

const ALTERNATE_ROW_FILL = "rgba(255, 255, 255, 0.08)";

const resolveFill = (
  paint: TimerColorPaint,
  isExpired: boolean,
  isAlternateRow: boolean,
) => {
  if (isAlternateRow && (isExpired || isUnpaintedTimerColor(paint))) {
    return ALTERNATE_ROW_FILL;
  }

  return isExpired ? EXPIRED_FILL : paint.fill;
};

/** An expired tile keeps a dimmed stripe so its colour group stays readable. */
const dimAccent = (accent: string) =>
  `color-mix(in srgb, ${accent} 40%, transparent)`;

const resolveTextColor = (
  legacyAppearance: boolean,
  isExpired: boolean,
  hasPassedRedThreshold: boolean,
  isMinSpawnTime: boolean,
) => {
  if (!legacyAppearance)
    return isExpired ? "ll:text-gray-400" : "ll:text-white";

  if (hasPassedRedThreshold) return "ll:text-red-500";

  if (isMinSpawnTime) return "ll:text-orange-400";

  return "ll:text-white";
};

export const TimerTileView: FC<TimerTileViewProps> = ({
  paint,
  legacyAppearance = false,
  displayMode,
  fontSize,
  hasPassedRedThreshold = false,
  isExpired = false,
  id,
  isAlternateRow = false,
  isMinSpawnTime = false,
  isPending = false,
  label,
  timeLabel,
}) => {
  // SAFETY: CSSProperties has no index signature for custom properties; the
  // `--ll-timer-*` entries are consumed by this element's own classes.
  const style = {
    "--ll-timer-accent":
      isExpired && !legacyAppearance ? dimAccent(paint.accent) : paint.accent,
    "--ll-timer-fill": legacyAppearance
      ? paint.fill
      : resolveFill(paint, isExpired, isAlternateRow),
    "--ll-timer-hover-fill": paint.hoverFill ?? paint.fill,
    fontSize: `${fontSize}px`,
  } as CSSProperties;

  return (
    <span
      id={id}
      className={cn(
        "ll-custom-cursor-pointer ll:flex ll:h-full ll:w-full ll:min-w-0 ll:items-center ll:border-solid ll:bg-[var(--ll-timer-fill)] ll:transition-colors ll:motion-reduce:transition-none",
        legacyAppearance
          ? "ll:rounded-[2px] ll:border ll:border-[var(--ll-timer-accent)] ll:px-1 ll:py-0.5 ll:hover:bg-[var(--ll-timer-hover-fill)]"
          : "ll:gap-1 ll:border-0 ll:border-l-[3px] ll:border-l-[var(--ll-timer-accent)] ll:px-[5px] ll:py-[4px] ll:font-semibold ll:hover:bg-[color-mix(in_srgb,var(--ll-timer-fill),rgba(255,255,255,0.75)_12%)]",
        resolveTextColor(
          legacyAppearance,
          isExpired,
          hasPassedRedThreshold,
          isMinSpawnTime,
        ),
        {
          "ll:flex-col ll:items-stretch ll:gap-0 ll:leading-[1.15]":
            displayMode === "column" && !legacyAppearance,
          "ll:flex-col ll:items-center ll:px-0 ll:leading-[1.05]":
            displayMode === "column" && legacyAppearance,
          "ll:justify-between": displayMode === "row",
          "ll:opacity-60 ll:blur-[0.5px]": isPending,
        },
      )}
      style={style}
    >
      <span
        className={cn("ll:min-w-0 ll:truncate ll:whitespace-nowrap", {
          "ll:text-center": displayMode === "column",
          "ll:w-full": displayMode === "column" && legacyAppearance,
        })}
      >
        {label}
      </span>
      <span
        className={cn("ll:shrink-0 ll:whitespace-nowrap", {
          "ll:text-center": displayMode === "column",
          "ll:tabular-nums": !legacyAppearance,
          "ll:text-red-400": !legacyAppearance && hasPassedRedThreshold,
          "ll:text-orange-300":
            !legacyAppearance && isMinSpawnTime && !hasPassedRedThreshold,
        })}
      >
        {timeLabel}
      </span>
    </span>
  );
};
