import type { FC } from "react";
import { SingleTimer } from "./single-timer";
import {
  getGuildIds,
  getGuildNamesById,
  useGuilds,
} from "@/hooks/api/use-guilds";
import type { TimerWithTimeLeft } from "../utils/timers-utils";

type TimersGridProps = {
  timers: TimerWithTimeLeft[];
  settingsKey: string;
  hiddenTimers: string[];
  minColumnWidth: number;
};

export const TimersGrid: FC<TimersGridProps> = ({
  timers,
  settingsKey,
  hiddenTimers,
  minColumnWidth,
}) => {
  const { data: guilds } = useGuilds();
  const guildIds = getGuildIds(guilds);
  const guildNamesById = getGuildNamesById(guilds);

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
            key={`${timer.timerKey}-${timer.guildId}`}
            guildIds={guildIds}
            guildNamesById={guildNamesById}
            timer={timer}
            maxTimeLeft={timer.maxTimeLeft}
            minTimeLeft={timer.minTimeLeft}
            settingsKey={settingsKey}
            isHidden={isHidden}
          />
        );
      })}
    </span>
  );
};
