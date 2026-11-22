import { parseMsToTime } from "@lootlog/datetime";
import {
  getTimerCountdownMs,
  type TimerCountdownMode,
  type TimerPhase,
  type TimerTimeLeft,
} from "@lootlog/domain/timers";
import { cn } from "cn";
import { DoorOpen } from "lucide-react";
import { useTranslation } from "react-i18next";

const PHASE_TEXT_CLASS = {
  entrance: "text-emerald-300",
  waiting: "text-foreground",
  window: "text-orange-300",
  overdue: "text-red-400",
  expired: "text-red-400/70",
} satisfies Record<TimerPhase, string>;

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

  return (
    <span
      className={cn(
        "flex shrink-0 items-center gap-1 text-[15px] leading-5 font-semibold tabular-nums",
        PHASE_TEXT_CLASS[phase],
        className,
      )}
    >
      {phase === "entrance" && (
        <DoorOpen
          aria-label={t("timers.entranceOpen")}
          role="img"
          className="size-4"
        />
      )}
      {parseMsToTime(getTimerCountdownMs(timeLeft, countdownMode))}
    </span>
  );
};
