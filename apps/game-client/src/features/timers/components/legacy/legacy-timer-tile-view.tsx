import { cn } from "cn";
import type { FC } from "react";
import { Tile } from "@/components/ui/tile";
import type { TimerCountdownPhase } from "@/features/timers/hooks/use-timer-countdown";
import type { TimerTileColors } from "@/features/timers/model/timer-colors";

export type LegacyTimerTileViewProps = {
  colors: TimerTileColors;
  displayMode: "column" | "row";
  fontSize: number;
  id?: string;
  isPending?: boolean;
  label: string;
  phase?: TimerCountdownPhase;
  timeLabel: string;
};

/** Static legacy tile: label plus a countdown text, coloured by phase. */
export const LegacyTimerTileView: FC<LegacyTimerTileViewProps> = ({
  colors,
  displayMode,
  fontSize,
  id,
  isPending = false,
  label,
  phase = "active",
  timeLabel,
}) => (
  <Tile id={id} className={colors.className} style={colors.style}>
    <span
      className={cn(
        "ll:flex ll:h-full ll:w-full ll:min-w-0 ll:justify-between ll:px-1 ll:text-[11px]",
        {
          "ll:text-red-500": phase === "expired",
          "ll:text-orange-400": phase === "afterMin",
          "ll:text-white": phase === "active",
          "ll:flex-col ll:items-center ll:px-0 ll:py-0 ll:leading-[1.05]":
            displayMode === "column",
          "ll:opacity-60 ll:blur-[0.5px]": isPending,
        },
      )}
    >
      <span
        className={cn(
          "ll:min-w-0 ll:max-w-full ll:truncate ll:whitespace-nowrap",
          { "ll:w-full ll:text-center": displayMode === "column" },
        )}
        style={{ fontSize: `${fontSize}px` }}
      >
        {label}
      </span>
      <span style={{ fontSize: `${fontSize}px` }}>{timeLabel}</span>
    </span>
  </Tile>
);
