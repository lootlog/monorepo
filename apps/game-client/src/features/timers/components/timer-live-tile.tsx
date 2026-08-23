import type { Timer } from "@/api/timers.api";
import { parseMsToTime } from "@/utils/parse-ms-to-time";
import { calculateTimeLeft } from "../utils/timer-helpers";
import { getTimerTimeLeft } from "../utils/timers-utils";
import { useTimerClockEpoch } from "./timer-clock-provider";
import { TimerTileView, type TimerTileViewProps } from "./timer-tile-view";

type TimerLiveTileProps = Omit<
  TimerTileViewProps,
  "hasPassedRedThreshold" | "isMinSpawnTime" | "timeLabel"
> & {
  countdownMode: "min" | "max";
  timer: Timer;
};

export const TimerLiveTile = ({
  countdownMode,
  timer,
  ...tileProps
}: TimerLiveTileProps) => {
  const epoch = useTimerClockEpoch();
  const { maxTimeLeft, minTimeLeft } = getTimerTimeLeft(timer, epoch);
  const isMinSpawnTime = minTimeLeft < 0;
  const hasPassedRedThreshold = maxTimeLeft < 0;
  const timeLeft = calculateTimeLeft(
    minTimeLeft,
    maxTimeLeft,
    countdownMode,
    isMinSpawnTime,
  );

  return (
    <TimerTileView
      {...tileProps}
      hasPassedRedThreshold={hasPassedRedThreshold}
      isMinSpawnTime={isMinSpawnTime}
      timeLabel={parseMsToTime(timeLeft)}
    />
  );
};
