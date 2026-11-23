import { cn } from "cn";
import { useLootlogGuilds } from "@/hooks/use-lootlog-guilds";
import { createAccessPolicy } from "@lootlog/domain/access-policy";
import { useState, type FC } from "react";
import { SingleTimer } from "./single-timer";
import { getGuildIds, getGuildNamesById } from "@/lib/api/generated-helpers";
import { getGuildPermissionsQueryOptions } from "@/hooks/api/guild-permissions-query";

import { useQueries } from "@tanstack/react-query";
import type { TimerWithTimeLeft } from "../utils/timers-utils";
import { TimerClockProvider } from "./timer-clock-provider";
import { TimerMapPresenceProvider } from "./timer-map-presence-provider";
import { getTimerGroupingKey } from "../timer-list-projection";
import { TimerGridPopups } from "./timer-grid-popups";

const getTimerTileKey = (timer: TimerWithTimeLeft) =>
  timer.mergedGuildIds
    ? `${timer.world}-${getTimerGroupingKey(timer)}`
    : `${timer.world}-${timer.guildId}-${timer.timerKey}`;

const MAX_ANIMATED_ARRIVALS = 5;

const resolveArrivedKeys = (
  previousKeys: ReadonlySet<string>,
  keys: readonly string[],
): ReadonlySet<string> => {
  const arrivedKeys = keys.filter((key) => !previousKeys.has(key));
  const continuesPreviousList = keys.some((key) => previousKeys.has(key));

  return continuesPreviousList && arrivedKeys.length <= MAX_ANIMATED_ARRIVALS
    ? new Set(arrivedKeys)
    : new Set();
};

type TimerArrivals = {
  keys: ReadonlySet<string>;
  arrivedKeys: ReadonlySet<string>;
};

type TimersGridProps = {
  timers: TimerWithTimeLeft[];
  settingsKey: string | undefined;
  hiddenTimers: string[];
  minColumnWidth: number;
  legacyAppearance?: boolean;
};

export const TimersGrid: FC<TimersGridProps> = ({
  timers,
  settingsKey,
  hiddenTimers,
  minColumnWidth,
  legacyAppearance = false,
}) => {
  const {
    guildsQuery: { data: guilds },
  } = useLootlogGuilds();

  const guildIds = getGuildIds(guilds);
  const guildNamesById = getGuildNamesById(guilds);
  const timerGuildIds = [...new Set(timers.map((timer) => timer.guildId))];

  const guildPermissionQueries = useQueries({
    queries: timerGuildIds.map((guildId) =>
      getGuildPermissionsQueryOptions(guildId, { refetchOnMount: false }),
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

  const timersByKey = new Map(
    timers.map((timer) => [getTimerTileKey(timer), timer]),
  );

  const tileKeys = [...timersByKey.keys()];

  const [arrivals, setArrivals] = useState<TimerArrivals>(() => ({
    keys: new Set(tileKeys),
    arrivedKeys: new Set(),
  }));

  if (
    arrivals.keys.size !== tileKeys.length ||
    tileKeys.some((key) => !arrivals.keys.has(key))
  ) {
    setArrivals({
      keys: new Set(tileKeys),
      arrivedKeys: resolveArrivedKeys(arrivals.keys, tileKeys),
    });
  }

  return (
    <TimerMapPresenceProvider timers={timers}>
      <TimerClockProvider>
        <TimerGridPopups
          className={cn(
            "ll:grid ll:pb-1",
            legacyAppearance
              ? "ll:w-full ll:gap-0.5"
              : "ll:-ml-px ll:w-[calc(100%+1px)] ll:[clip-path:inset(0_0_0_1px)]",
          )}
          style={{
            gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${minColumnWidth}px), 1fr))`,
          }}
          guildNamesById={guildNamesById}
          timersByKey={timersByKey}
        >
          {timers.map((timer) => {
            const isHidden = hiddenTimerNames.has(timer.npc.name);
            const tileKey = getTimerTileKey(timer);

            return (
              <SingleTimer
                key={tileKey}
                popupKey={tileKey}
                guildIds={guildIds}
                guildNamesById={guildNamesById}
                accessPolicy={accessPoliciesByGuildId[timer.guildId]}
                timer={timer}
                settingsKey={settingsKey}
                isHidden={isHidden}
                arrives={arrivals.arrivedKeys.has(tileKey)}
              />
            );
          })}
        </TimerGridPopups>
      </TimerClockProvider>
    </TimerMapPresenceProvider>
  );
};
