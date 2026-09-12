import type { FC } from "react";
import type { TimersWindowModel } from "@/features/timers/hooks/use-timers-window-model";
import { TimerClockProvider } from "../shared/timer-clock-provider";
import { LegacyTimerTile } from "./legacy-timer-tile";

type LegacyTimersGridProps = {
  model: TimersWindowModel;
};

export const LegacyTimersGrid: FC<LegacyTimersGridProps> = ({ model }) => (
  <TimerClockProvider>
    <span
      className="ll:grid ll:gap-0.5 ll:w-full"
      style={{
        gridTemplateColumns: `repeat(auto-fit, minmax(${model.appearance.displayConfig.minColumnWidth}px, 1fr))`,
      }}
    >
      {model.list.timers.map((timer) => (
        <LegacyTimerTile
          key={`${timer.timerKey}-${timer.guildId}`}
          timer={timer}
          model={model}
        />
      ))}
    </span>
  </TimerClockProvider>
);
