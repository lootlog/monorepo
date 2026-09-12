import { cn } from "cn";
import type { FC } from "react";
import type { Timer } from "@/api/timers.api";
import { useTimerCountdown } from "@/features/timers/hooks/use-timer-countdown";

type ModernTimerTileFaceProps = {
  timer: Timer;
  countdownMode: "min" | "max";
  badge: string;
  levelTag: string;
};

/**
 * The ticking part of a modern tile: name, level and countdown share the
 * phase colour (white, orange after the minimum time, red after the maximum),
 * so the whole row reads the same way the classic layout did.
 */
export const ModernTimerTileFace: FC<ModernTimerTileFaceProps> = ({
  timer,
  countdownMode,
  badge,
  levelTag,
}) => {
  const { timeLabel, phase } = useTimerCountdown(timer, countdownMode);

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
          "ll:flex ll:min-w-0 ll:flex-1 ll:items-baseline ll:gap-(--ll-timers-space-xs)",
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
      <span className={cn("ll:shrink-0 ll:tabular-nums", phaseClassName)}>
        {timeLabel}
      </span>
    </>
  );
};
