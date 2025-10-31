import type { FC } from "react";
import { SingleTimer } from "./single-timer";
import type { TimerWithTimeLeft } from "../utils/timers-utils";

type TimersGridProps = {
  timers: TimerWithTimeLeft[];
  settingsKey: string;
  hiddenTimers: string[];
  canDeleteTimers: boolean;
  minColumnWidth: number;
};

export const TimersGrid: FC<TimersGridProps> = ({
  timers,
  settingsKey,
  hiddenTimers,
  canDeleteTimers,
  minColumnWidth,
}) => {
  return (
    <span
      className="ll:grid ll:gap-0.5 ll:box-border ll:w-full"
      style={{
        gridTemplateColumns: `repeat(auto-fit, minmax(${minColumnWidth}px, 1fr))`,
      }}
    >
      {timers.map((timer) => {
        const isHidden = hiddenTimers.includes(timer.npc.name);
        return (
          <SingleTimer
            key={`${timer.npcId}-${timer.guildId}`}
            timer={timer}
            maxTimeLeft={timer.maxTimeLeft}
            minTimeLeft={timer.minTimeLeft}
            canDelete={canDeleteTimers}
            settingsKey={settingsKey}
            isHidden={isHidden}
          />
        );
      })}
    </span>
  );
};
