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
  badge: string;
  levelTag: string;
};

/**
 * The ticking part of a modern tile: name, level and countdown share the
 * phase colour (white, orange after the minimum time, red after the maximum),
 * so the whole row reads the same way the classic layout did. The progress
 * fill is one CSS animation set at mount; the parent remounts the face when
 * the spawn window changes.
 */
export const ModernTimerTileFace: FC<ModernTimerTileFaceProps> = ({
  timer,
  countdownMode,
  showProgress,
  progressColor,
  badge,
  levelTag,
}) => {
  const mountEpoch = useTimerClockEpoch();
  const { timeLabel, phase } = useTimerCountdown(timer, countdownMode);

  const [progressStyle] = useState(() =>
    showProgress ? getTimerProgressStyle(timer, mountEpoch) : undefined,
  );

  const phaseClassName =
    phase === "expired"
      ? "ll:text-red-500"
      : phase === "afterMin"
        ? "ll:text-orange-400"
        : "ll:text-white";

  return (
    <>
      <span
        className={cn(
          "ll:relative ll:flex ll:min-w-0 ll:flex-1 ll:items-baseline ll:gap-(--ll-timers-space-xs)",
          phaseClassName,
        )}
      >
        {badge && (
          <span className="ll:shrink-0 ll:text-(--ll-timers-badge-font-size) ll:opacity-75">
            {badge}
          </span>
        )}
        <span className="ll:min-w-0 ll:truncate">{timer.npc.name}</span>
        {levelTag && (
          <span className="ll:shrink-0 ll:text-(--ll-timers-badge-font-size) ll:opacity-75">
            {levelTag}
          </span>
        )}
      </span>
      <span
        className={cn(
          "ll:relative ll:shrink-0 ll:tabular-nums",
          phaseClassName,
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
