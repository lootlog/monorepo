import { cn } from "cn";
import { useLootlogGuilds } from "@/hooks/use-lootlog-guilds";
import { createAccessPolicy } from "@lootlog/domain/access-policy";
import { type FC, useEffect, useRef, useState } from "react";
import { SingleTimer } from "./single-timer";
import { getGuildIds, getGuildNamesById } from "@/lib/api/generated-helpers";
import {
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
  legacyAppearance?: boolean;
};

/**
 * Mirrors `repeat(auto-fit, minmax(minColumnWidth, 1fr))` without a gap, so
 * row parity computed here matches the rows the browser lays out.
 */
const countGridColumns = (gridWidth: number, minColumnWidth: number) =>
  Math.max(1, Math.floor(gridWidth / minColumnWidth));

const useGridWidth = () => {
  const gridRef = useRef<HTMLSpanElement>(null);
  const [gridWidth, setGridWidth] = useState(0);

  useEffect(() => {
    const grid = gridRef.current;

    if (!grid) return;

    const resizeObserver = new ResizeObserver(([entry]) => {
      if (entry) setGridWidth(entry.contentRect.width);
    });

    resizeObserver.observe(grid);

    return () => resizeObserver.disconnect();
  }, []);

  return { gridRef, gridWidth };
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
  const { gridRef, gridWidth } = useGridWidth();
  const columnCount = countGridColumns(gridWidth, minColumnWidth);

  return (
    <TimerClockProvider>
      <span
        ref={gridRef}
        className={cn(
          "ll:grid ll:w-full ll:pb-1",
          legacyAppearance && "ll:gap-0.5",
        )}
        style={{
          gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${minColumnWidth}px), 1fr))`,
        }}
      >
        {timers.map((timer, index) => {
          const isHidden = hiddenTimerNames.has(timer.npc.name);
          const isAlternateRow = Math.floor(index / columnCount) % 2 === 1;

          return (
            <SingleTimer
              key={`${timer.timerKey}-${timer.guildId}`}
              guildIds={guildIds}
              guildNamesById={guildNamesById}
              accessPolicy={accessPoliciesByGuildId[timer.guildId]}
              timer={timer}
              settingsKey={settingsKey}
              isHidden={isHidden}
              isAlternateRow={!legacyAppearance && isAlternateRow}
            />
          );
        })}
      </span>
    </TimerClockProvider>
  );
};
