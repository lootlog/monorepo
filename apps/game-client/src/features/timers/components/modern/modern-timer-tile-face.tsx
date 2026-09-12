import { cn } from "cn";
import { useState, type FC } from "react";
import type { Timer } from "@/api/timers.api";
import { useTimerCountdown } from "@/features/timers/hooks/use-timer-countdown";
import { useTimerClockEpoch } from "@/features/timers/components/shared/timer-clock-provider";
import { getTimerProgressStyle } from "@/features/timers/model/timer-progress";

type ModernTimerTileFaceProps = {
  timer: Timer;
  countdownMode: "min" | "max";
  showProgress: boolean;
};

/**
 * The ticking part of a modern tile: the countdown text and the progress line.
 * Only the text node changes per second; the line is one CSS animation set
 * once at mount (the parent remounts the face when the spawn window changes).
 */
export const ModernTimerTileFace: FC<ModernTimerTileFaceProps> = ({
  timer,
  countdownMode,
  showProgress,
}) => {
  const mountEpoch = useTimerClockEpoch();
  const { timeLabel, phase } = useTimerCountdown(timer, countdownMode);

  const [progressStyle] = useState(() =>
    showProgress ? getTimerProgressStyle(timer, mountEpoch) : undefined,
  );

  return (
    <>
      <span
        className={cn(
          "ll:shrink-0 ll:tabular-nums ll:font-semibold",
          phase === "expired" && "ll:text-red-400",
          phase === "afterMin" && "ll:text-amber-300",
          phase === "active" && "ll:text-gray-100",
        )}
      >
        {timeLabel}
      </span>
      {progressStyle && phase === "active" && (
        <span
          aria-hidden
          className="ll:pointer-events-none ll:absolute ll:inset-x-0 ll:bottom-0 ll:h-px ll:origin-left ll:bg-white/50 ll:motion-reduce:hidden"
          style={progressStyle}
        />
      )}
    </>
  );
};
