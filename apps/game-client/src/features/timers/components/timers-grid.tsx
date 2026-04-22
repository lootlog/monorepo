import type { FC } from "react";
import { SingleTimer } from "./single-timer";
import { getGuildIds, getGuildNamesById } from "@/lib/api/generated-helpers";
import {
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey,
  useUsersControllerGetCurrentUserAccessibleGuilds,
} from "@/lib/api/generated/main/users/users";
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
  const { data: guilds } = useUsersControllerGetCurrentUserAccessibleGuilds({
    query: {
      queryKey: getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
      refetchOnMount: false,
      staleTime: 1000 * 60 * 5,
    },
  });
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
