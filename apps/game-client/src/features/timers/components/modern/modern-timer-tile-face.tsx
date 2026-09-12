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
  /** Colour of the fill that grows across the row as the respawn nears. */
  progressColor: string;
};

/**
 * The ticking part of a modern tile: the countdown text and the progress
 * fill. Only the text node changes per second; the fill is one CSS animation
 * set at mount (the parent remounts the face when the spawn window changes).
 */
export const ModernTimerTileFace: FC<ModernTimerTileFaceProps> = ({
  timer,
  countdownMode,
  showProgress,
  progressColor,
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
          "ll:relative ll:shrink-0 ll:tabular-nums ll:font-medium",
          phase === "expired" && "ll:text-red-300",
          phase === "afterMin" && "ll:text-amber-200",
          phase === "active" && "ll:text-gray-50",
        )}
      >
        {timeLabel}
      </span>
      {progressStyle && phase === "active" && (
        <span
          aria-hidden
          className="ll:pointer-events-none ll:absolute ll:inset-y-0 ll:start-0 ll:-z-10 ll:w-full ll:origin-left ll:motion-reduce:hidden"
          style={{
            ...progressStyle,
            backgroundColor: `color-mix(in srgb, ${progressColor} 22%, transparent)`,
          }}
        />
      )}
    </>
  );
};
