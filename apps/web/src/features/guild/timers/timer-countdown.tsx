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

// The game client's colours: green while a Hero Tracker's entrance is open,
// white until the spawn window opens, orange inside it, red past the maximum,
// and a dimmed red for a kept timer.
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

/** A timer's one countdown, coloured by its phase as in the game client. */
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
