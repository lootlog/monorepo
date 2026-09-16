import { useTimersStore } from "@/store/timers.store";
import type { Timer } from "@/api/timers.api";
import { parseMsToTime } from "@lootlog/datetime";
import { calculateTimeLeft } from "../utils/timer-helpers";
import { getTimerTimeLeft } from "../utils/timers-utils";
import { useTimerClockEpoch } from "./timer-clock-provider";
import { TimerTileView, type TimerTileViewProps } from "./timer-tile-view";

type TimerLiveTileProps = Omit<
  TimerTileViewProps,
  "hasPassedRedThreshold" | "isExpired" | "isMinSpawnTime" | "timeLabel"
> & {
  countdownMode: "min" | "max";
  timer: Timer;
};

export const TimerLiveTile = ({
  countdownMode,
  timer,
  ...tileProps
}: TimerLiveTileProps) => {
  const removeTimerAfterMs = useTimersStore(
    (state) => state.generalConfig.removeTimerAfterMs,
  );
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
      isExpired={maxTimeLeft <= -removeTimerAfterMs}
      isMinSpawnTime={isMinSpawnTime}
      timeLabel={parseMsToTime(timeLeft)}
    />
  );
};
