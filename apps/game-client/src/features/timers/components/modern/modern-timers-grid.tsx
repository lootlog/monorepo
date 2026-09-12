import type { FC } from "react";
import type { TimersWindowModel } from "@/features/timers/hooks/use-timers-window-model";
import { TimerClockProvider } from "../shared/timer-clock-provider";
import { ModernTimerTile } from "./modern-timer-tile";

type ModernTimersGridProps = {
  model: TimersWindowModel;
};

/**
 * Auto-fit grid: one column in a narrow window, several columns in a wide and
 * low one. The minimum column width and the gap are density variables.
 */
export const ModernTimersGrid: FC<ModernTimersGridProps> = ({ model }) => (
  <TimerClockProvider>
    <div
      role="list"
      className="ll:grid ll:w-full ll:grid-cols-[repeat(auto-fit,minmax(min(100%,var(--ll-timers-min-column)),1fr))] ll:gap-(--ll-timers-gap)"
    >
      {model.list.timers.map((timer) => (
        <ModernTimerTile
          key={`${timer.timerKey}-${timer.guildId}`}
          timer={timer}
          model={model}
        />
      ))}
    </div>
  </TimerClockProvider>
);
