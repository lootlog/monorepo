import type { FC } from "react";
import type { Timer } from "@/api/timers.api";
import { useTimerCountdown } from "@/features/timers/hooks/use-timer-countdown";
import {
  LegacyTimerTileView,
  type LegacyTimerTileViewProps,
} from "./legacy-timer-tile-view";

type LegacyTimerTileFaceProps = Omit<
  LegacyTimerTileViewProps,
  "phase" | "timeLabel"
> & {
  countdownMode: "min" | "max";
  timer: Timer;
};

/** The ticking leaf of a legacy tile; only this node re-renders on each clock tick. */
export const LegacyTimerTileFace: FC<LegacyTimerTileFaceProps> = ({
  countdownMode,
  timer,
  ...viewProps
}) => {
  const { timeLabel, phase } = useTimerCountdown(timer, countdownMode);

  return (
    <LegacyTimerTileView {...viewProps} phase={phase} timeLabel={timeLabel} />
  );
};
