import { parseMsToTime } from "@lootlog/datetime";
import {
  getTimerCountdownMs,
  type TimerCountdownMode,
  type TimerPhase,
  type TimerTimeLeft,
} from "@lootlog/domain/timers";
import { useChangeCount } from "@lootlog/ui/hooks/use-change-count";
import { cn } from "cn";
import { DoorOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import { TIMER_PHASE_TEXT_CLASS } from "./timer-phase-text-class";

type TimerCountdownProps = {
  timeLeft: TimerTimeLeft;
  phase: TimerPhase;
  countdownMode: TimerCountdownMode;
  className?: string;
};

export const TimerCountdown = ({
  timeLeft,
  phase,
  countdownMode,
  className,
}: TimerCountdownProps) => {
  const { t } = useTranslation();
  const phaseChangeCount = useChangeCount(phase);

  return (
    <span
      className={cn(
        "flex shrink-0 items-center gap-1 text-[15px] leading-5 font-semibold tabular-nums transition-colors duration-500 motion-reduce:transition-none",
        TIMER_PHASE_TEXT_CLASS[phase],
        className,
      )}
    >
      {phase === "entrance" && (
        <DoorOpen
          aria-label={t("timers.entranceOpen")}
          role="img"
          className={cn(
            "size-4",
            phaseChangeCount > 0 && "animate-pop-in motion-reduce:animate-none",
          )}
        />
      )}
      {parseMsToTime(getTimerCountdownMs(timeLeft, countdownMode))}
    </span>
  );
};
