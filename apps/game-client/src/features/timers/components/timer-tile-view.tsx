import { cn } from "cn";
import type { CSSProperties, FC } from "react";
import { ListRow, veilColor } from "@/components/list-row";
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
  isAlternateRow?: boolean;
  isMinSpawnTime?: boolean;
  isPending?: boolean;
  label: string;
  timeLabel: string;
};

/** An expired tile keeps its colour, darkened. */
const EXPIRED_VEIL = "black 40%";

/**
 * The whole tile text follows the spawn window: amber once the minimum
 * spawn time passes, red after the maximum, and a dimmed red once expired.
 * Light tints keep the text readable on every tile colour, and amber stays
 * apart from the light red on the warm fills.
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

  if (isExpired) return "ll:text-red-300/70";

  if (hasPassedRedThreshold) return "ll:text-red-300";

  if (isMinSpawnTime) return "ll:text-amber-300";

  return "ll:text-white";
};

/** Separates the text from a tile fill of the same hue. */
const TEXT_OUTLINE = "ll:[text-shadow:0_1px_2px_rgb(0_0_0/0.7)]";

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
  const textColorClassName = resolveTextColor(
    legacyAppearance,
    isExpired,
    hasPassedRedThreshold,
    isMinSpawnTime,
  );

  const content = (
    <>
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
    </>
  );

  if (legacyAppearance) {
    return (
      <span
        id={id}
        className={cn(
          "ll-custom-cursor-pointer ll:flex ll:h-full ll:w-full ll:min-w-0 ll:items-center ll:rounded-[2px] ll:border ll:border-solid ll:border-[var(--ll-timer-accent)] ll:bg-[var(--ll-timer-fill)] ll:px-1 ll:py-0.5 ll:transition-colors ll:hover:bg-[var(--ll-timer-hover-fill)] ll:motion-reduce:transition-none",
          textColorClassName,
          {
            "ll:flex-col ll:items-center ll:px-0 ll:leading-[1.05]":
              displayMode === "column",
            "ll:justify-between": displayMode === "row",
            "ll:opacity-60 ll:blur-[0.5px]": isPending,
          },
        )}
        // SAFETY: CSSProperties has no index signature for custom properties;
        // the `--ll-timer-*` entries are consumed by this element's classes.
        style={
          {
            "--ll-timer-accent": paint.accent,
            "--ll-timer-fill": paint.fill,
            "--ll-timer-hover-fill": paint.hoverFill ?? paint.fill,
            fontSize: `${fontSize}px`,
          } as CSSProperties
        }
      >
        {content}
      </span>
    );
  }

  return (
    <ListRow
      id={id}
      fill={isExpired ? veilColor(paint.fill, EXPIRED_VEIL) : paint.fill}
      isAlternateRow={isAlternateRow}
      className={cn("ll:h-full ll:py-[4px]", textColorClassName, TEXT_OUTLINE, {
        "ll:border-0 ll:border-l-[3px] ll:border-solid ll:border-l-[var(--ll-timer-accent)] ll:px-[5px]":
          showColorStripe,
        "ll:flex-col ll:items-stretch ll:gap-0 ll:leading-[1.15]":
          displayMode === "column",
        "ll:justify-between": displayMode === "row",
        "ll:opacity-60 ll:blur-[0.5px]": isPending,
      })}
      // SAFETY: CSSProperties has no index signature for custom properties;
      // "--ll-timer-accent" is consumed by the stripe class.
      style={
        {
          "--ll-timer-accent": isExpired
            ? veilColor(paint.accent, EXPIRED_VEIL)
            : paint.accent,
          fontSize: `${fontSize}px`,
        } as CSSProperties
      }
    >
      {content}
    </ListRow>
  );
};
