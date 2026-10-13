import { useTimersStore } from "@/store/timers.store";
import type { Timer } from "@/api/timers.api";
import { parseMsToTime } from "@lootlog/datetime";
import { getTimerCountdownMs, getTimerPhase } from "@lootlog/domain/timers";
import { getTimerTimeLeft } from "../utils/timers-utils";
import { useTimerClockEpoch } from "./timer-clock-provider";
import { TimerTileView, type TimerTileViewProps } from "./timer-tile-view";

type TimerLiveTileProps = Omit<TimerTileViewProps, "phase" | "timeLabel"> & {
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
  const timeLeft = getTimerTimeLeft(timer, epoch);

  return (
    <TimerTileView
      {...tileProps}
      phase={getTimerPhase(timeLeft, removeTimerAfterMs)}
      timeLabel={parseMsToTime(getTimerCountdownMs(timeLeft, countdownMode))}
    />
  );
};
