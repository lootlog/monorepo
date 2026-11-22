import { cn } from "cn";
import type { CSSProperties, FC, ReactNode } from "react";
import type { TimerPhase } from "@lootlog/domain/timers";
import { ListRow, veilColor } from "@/components/list-row";
import type { TimerColorPaint } from "@lootlog/domain/timer-colors";

export type TimerTileViewProps = {
  paint: TimerColorPaint;
  legacyAppearance?: boolean;
  displayMode: "column" | "row";
  fontSize: number;
  phase?: TimerPhase;
  id?: string;
  isPending?: boolean;
  isStanding?: boolean;
  label: string;
  timeLabel: string;
  timeAdornment?: ReactNode;
};

const EXPIRED_VEIL = "black 40%";

const TEXT_COLORS = {
  entrance: "ll:text-emerald-300",
  waiting: "ll:text-white",
  window: "ll:text-orange-300",
  overdue: "ll:text-red-400",
  expired: "ll:text-red-400/70",
} satisfies Record<TimerPhase, string>;

const LEGACY_TEXT_COLORS = {
  entrance: "ll:text-emerald-400",
  waiting: "ll:text-white",
  window: "ll:text-orange-400",
  overdue: "ll:text-red-500",
  expired: "ll:text-red-500",
} satisfies Record<TimerPhase, string>;

const TEXT_OUTLINE = "ll:[text-shadow:0_1px_2px_rgb(0_0_0/0.7)]";

export const TimerTileView: FC<TimerTileViewProps> = ({
  paint,
  legacyAppearance = false,
  displayMode,
  fontSize,
  phase = "waiting",
  id,
  isPending = false,
  isStanding = false,
  label,
  timeLabel,
  timeAdornment,
}) => {
  const textColorClassName = (
    legacyAppearance ? LEGACY_TEXT_COLORS : TEXT_COLORS
  )[phase];

  const isExpired = phase === "expired";

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
        {timeAdornment}
        {timeLabel}
      </span>
    </>
  );

  if (legacyAppearance) {
    return (
      <span
        id={id}
        className={cn(
          "ll-custom-cursor-pointer ll:@container/timer-tile ll:flex ll:h-full ll:w-full ll:min-w-0 ll:items-center ll:rounded-[2px] ll:border ll:border-solid ll:border-[var(--ll-timer-accent)] ll:bg-[var(--ll-timer-fill)] ll:px-1 ll:py-0.5 ll:transition-colors ll:hover:bg-[var(--ll-timer-hover-fill)] ll:motion-reduce:transition-none",
          textColorClassName,
          {
            "ll:flex-col ll:items-center ll:px-0 ll:leading-[1.05]":
              displayMode === "column",
            "ll:justify-between": displayMode === "row",
            "ll:opacity-60 ll:blur-[0.5px]": isPending,
            "ll-timer-standing": isStanding,
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
      className={cn(
        "ll:@container/timer-tile ll:h-full ll:py-[4px]",
        textColorClassName,
        TEXT_OUTLINE,
        "ll:shadow-[inset_1px_0_0_rgb(255_255_255/0.08),inset_0_-1px_0_rgb(255_255_255/0.08)]",
        {
          "ll:flex-col ll:items-stretch ll:gap-0 ll:leading-[1.15]":
            displayMode === "column",
          "ll:justify-between": displayMode === "row",
          "ll:opacity-60 ll:blur-[0.5px]": isPending,
          "ll-timer-standing": isStanding,
        },
      )}
      // SAFETY: CSSProperties has no index signature for custom properties;
      // "--ll-timer-accent" is consumed by the standing class.
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
