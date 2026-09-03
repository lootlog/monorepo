import { createAccessPolicy } from "@lootlog/domain/access-policy";
import type { FC } from "react";
import { SingleTimer } from "./single-timer";
import { getGuildIds, getGuildNamesById } from "@/lib/api/generated-helpers";
import {
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey,
  useUsersControllerGetCurrentUserAccessibleGuilds,
  getGuildsControllerGetGuildPermissionsQueryKey,
  getGuildsControllerGetGuildPermissionsQueryOptions,
} from "@lootlog/client/main";

import { useQueries } from "@tanstack/react-query";
import type { TimerWithTimeLeft } from "../utils/timers-utils";
import { TimerClockProvider } from "./timer-clock-provider";

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
  const timerGuildIds = [...new Set(timers.map((timer) => timer.guildId))];
  const guildPermissionQueries = useQueries({
    queries: timerGuildIds.map((guildId) =>
      getGuildsControllerGetGuildPermissionsQueryOptions(
        { guildId },
        {
          query: {
            queryKey: getGuildsControllerGetGuildPermissionsQueryKey({
              guildId,
            }),
            refetchOnMount: false,
            staleTime: 5 * 60 * 1000,
          },
        },
      ),
    ),
  });
  const accessPoliciesByGuildId = Object.fromEntries(
    timerGuildIds.map((guildId, index) => [
      guildId,
      createAccessPolicy({
        capabilities: guildPermissionQueries[index]?.data ?? [],
      }),
    ]),
  );
  const hiddenTimerNames = new Set(hiddenTimers);

  return (
    <TimerClockProvider>
      <span
        className="ll:grid ll:gap-0.5 ll:box-border ll:w-full"
        style={{
          gridTemplateColumns: `repeat(auto-fit, minmax(${minColumnWidth}px, 1fr))`,
        }}
      >
        {timers.map((timer) => {
          const isHidden = hiddenTimerNames.has(timer.npc.name);
          return (
            <SingleTimer
              key={`${timer.timerKey}-${timer.guildId}`}
              guildIds={guildIds}
              guildNamesById={guildNamesById}
              accessPolicy={accessPoliciesByGuildId[timer.guildId]}
              timer={timer}
              settingsKey={settingsKey}
              isHidden={isHidden}
            />
          );
        })}
      </span>
    </TimerClockProvider>
  );
};
