import { Tile } from "@/components/ui/tile";
import { cn } from "cn";
import type { TIMERS_COLORS } from "@/features/timers/constants/timer-colors";
import type { FC } from "react";

export type TimerTileViewProps = {
  color?: keyof typeof TIMERS_COLORS | string;
  customBackgroundColor?: string;
  displayMode: "column" | "row";
  fontSize: number;
  hasPassedRedThreshold?: boolean;
  id?: string;
  isMinSpawnTime?: boolean;
  isPending?: boolean;
  label: string;
  timeLabel: string;
};

export const TimerTileView: FC<TimerTileViewProps> = ({
  color,
  customBackgroundColor,
  displayMode,
  fontSize,
  hasPassedRedThreshold = false,
  id,
  isMinSpawnTime = false,
  isPending = false,
  label,
  timeLabel,
}) => (
  <Tile
    id={id}
    color={color}
    customBackgroundColor={customBackgroundColor}
    className="ll:rounded-none ll:border-0 ll:py-[5px] ll:shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.4)]"
  >
    <span
      className={cn(
        "ll:flex ll:h-full ll:w-full ll:min-w-0 ll:justify-between ll:px-[5px] ll:text-[11px]",
        "ll:text-white",
        {
          "ll:flex-col ll:items-center ll:px-0 ll:py-0 ll:leading-[1.05]":
            displayMode === "column",
          "ll:opacity-60 ll:blur-[0.5px]": isPending,
        },
      )}
    >
      <span
        className={cn(
          "ll:min-w-0 ll:max-w-full ll:truncate ll:whitespace-nowrap ll:font-semibold ll:[text-shadow:0_1px_1px_rgba(0,0,0,0.5)]",
          {
            "ll:w-full ll:text-center": displayMode === "column",
          },
        )}
        style={{ fontSize: `${fontSize}px` }}
      >
        {label}
      </span>
      <span
        className={cn(
          "ll:shrink-0 ll:whitespace-nowrap ll:font-semibold ll:tabular-nums",
          {
            "ll:text-red-400": hasPassedRedThreshold,
            "ll:text-orange-300": isMinSpawnTime && !hasPassedRedThreshold,
          },
        )}
        style={{ fontSize: `${fontSize}px` }}
      >
        {timeLabel}
      </span>
    </span>
  </Tile>
);
