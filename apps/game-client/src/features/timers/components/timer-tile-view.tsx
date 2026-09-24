import { cn } from "cn";
import type { CSSProperties, FC } from "react";
import type { TimerColorPaint } from "@/features/timers/constants/timer-colors";

export type TimerTileViewProps = {
  paint: TimerColorPaint;
  legacyAppearance?: boolean;
  /** Paints the timer colour as a stripe on the tile's left edge. */
  showColorStripe?: boolean;
  displayMode: "column" | "row";
  fontSize: number;
  hasPassedRedThreshold?: boolean;
  isExpired?: boolean;
  id?: string;
  /**
   * Every other grid row gets a faint light veil, so neighbouring timers of
   * one colour stay apart while keeping their hue.
   */
  isAlternateRow?: boolean;
  isMinSpawnTime?: boolean;
  isPending?: boolean;
  label: string;
  timeLabel: string;
};

const ALTERNATE_ROW_VEIL = "white 6%";

/** An expired tile keeps its colour, darkened. */
const EXPIRED_VEIL = "black 40%";

const veil = (color: string, overlay: string) =>
  `color-mix(in srgb, ${color}, ${overlay})`;

const resolveFill = (
  fill: string,
  isExpired: boolean,
  isAlternateRow: boolean,
) => {
  const base = isExpired ? veil(fill, EXPIRED_VEIL) : fill;

  return isAlternateRow ? veil(base, ALTERNATE_ROW_VEIL) : base;
};

/**
 * The whole tile text follows the spawn window: orange once the minimum
 * spawn time passes, red after the maximum, and a dimmed red once expired.
 */
const resolveTextColor = (
  legacyAppearance: boolean,
  isExpired: boolean,
  hasPassedRedThreshold: boolean,
  isMinSpawnTime: boolean,
) => {
  if (legacyAppearance) {
    if (hasPassedRedThreshold) return "ll:text-red-500";

    if (isMinSpawnTime) return "ll:text-orange-400";

    return "ll:text-white";
  }

  if (isExpired) return "ll:text-red-400/70";

  if (hasPassedRedThreshold) return "ll:text-red-400";

  if (isMinSpawnTime) return "ll:text-orange-300";

  return "ll:text-white";
};

export const TimerTileView: FC<TimerTileViewProps> = ({
  paint,
  legacyAppearance = false,
  showColorStripe = true,
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
      isExpired && !legacyAppearance
        ? veil(paint.accent, EXPIRED_VEIL)
        : paint.accent,
    "--ll-timer-fill": legacyAppearance
      ? paint.fill
      : resolveFill(paint.fill, isExpired, isAlternateRow),
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
          : "ll:gap-1 ll:border-0 ll:py-[4px] ll:font-semibold ll:hover:bg-[color-mix(in_srgb,var(--ll-timer-fill),rgba(255,255,255,0.75)_12%)]",
        !legacyAppearance &&
          (showColorStripe
            ? "ll:border-l-[3px] ll:border-l-[var(--ll-timer-accent)] ll:px-[5px]"
            : "ll:px-[6px]"),
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
        })}
      >
        {timeLabel}
      </span>
    </span>
  );
};
