import { Tile } from "@/components/ui/tile";
import { cn } from "@/lib/utils";
import type { TIMERS_COLORS } from "@/features/timers/constants/timer-colors";
import type { FC } from "react";

type TimerTileViewProps = {
  color?: keyof typeof TIMERS_COLORS | string;
  customBorderColor?: string;
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
  customBorderColor,
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
    customBorderColor={customBorderColor}
    customBackgroundColor={customBackgroundColor}
  >
    <span
      className={cn(
        "ll:flex ll:h-full ll:w-full ll:min-w-0 ll:justify-between ll:px-1 ll:text-[11px] ll:box-border",
        {
          "ll:text-red-500": hasPassedRedThreshold,
          "ll:text-orange-400": isMinSpawnTime && !hasPassedRedThreshold,
          "ll:text-white": !hasPassedRedThreshold && !isMinSpawnTime,
          "ll:flex-col ll:items-center ll:px-0 ll:py-0 ll:leading-[1.05]":
            displayMode === "column",
          "ll:opacity-60 ll:blur-[0.5px]": isPending,
        },
      )}
    >
      <span
        className={cn(
          "ll:min-w-0 ll:max-w-full ll:truncate ll:whitespace-nowrap",
          {
            "ll:w-full ll:text-center": displayMode === "column",
          },
        )}
        style={{ fontSize: `${fontSize}px` }}
      >
        {label}
      </span>
      <span style={{ fontSize: `${fontSize}px` }}>{timeLabel}</span>
    </span>
  </Tile>
);
