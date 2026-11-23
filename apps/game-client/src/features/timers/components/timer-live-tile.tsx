import { useState } from "react";
import { useTimersStore } from "@/store/timers.store";
import type { Timer } from "@/api/timers.api";
import { parseMsToTime } from "@lootlog/datetime";
import {
  getTimerCountdownMs,
  getTimerPhase,
  type TimerPhase,
} from "@lootlog/domain/timers";
import { getTimerTimeLeft } from "../utils/timers-utils";
import { useTimerClockEpoch } from "./timer-clock-provider";
import { TimerTileView, type TimerTileViewProps } from "./timer-tile-view";

const FLASHING_PHASES: ReadonlySet<TimerPhase> = new Set([
  "entrance",
  "window",
]);

type TimerLiveTileProps = Omit<
  TimerTileViewProps,
  "phase" | "phaseFlashCount" | "timeLabel"
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
  const timeLeft = getTimerTimeLeft(timer, epoch);
  const phase = getTimerPhase(timeLeft, removeTimerAfterMs);
  const [phaseFlash, setPhaseFlash] = useState({ phase, count: 0 });

  if (phaseFlash.phase !== phase) {
    setPhaseFlash({
      phase,
      count: phaseFlash.count + (FLASHING_PHASES.has(phase) ? 1 : 0),
    });
  }

  return (
    <TimerTileView
      {...tileProps}
      phase={phase}
      phaseFlashCount={phaseFlash.count}
      timeLabel={parseMsToTime(getTimerCountdownMs(timeLeft, countdownMode))}
    />
  );
};
