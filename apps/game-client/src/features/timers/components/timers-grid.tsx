import { cn } from "cn";
import { useLootlogGuilds } from "@/hooks/use-lootlog-guilds";
import { createAccessPolicy } from "@lootlog/domain/access-policy";
import { type FC, useLayoutEffect, useRef, useState } from "react";
import { SingleTimer } from "./single-timer";
import { getGuildIds, getGuildNamesById } from "@/lib/api/generated-helpers";
import {
  getGuildsControllerGetGuildPermissionsQueryKey,
  getGuildsControllerGetGuildPermissionsQueryOptions,
} from "@lootlog/client/main";

import { useQueries } from "@tanstack/react-query";
import type { TimerWithTimeLeft } from "../utils/timers-utils";
import { TimerClockProvider } from "./timer-clock-provider";
import { TimerMapPresenceProvider } from "./timer-map-presence-provider";
import { getTimerGroupingKey } from "../timer-list-projection";

type TimersGridProps = {
  timers: TimerWithTimeLeft[];
  settingsKey: string;
  hiddenTimers: string[];
  minColumnWidth: number;
  legacyAppearance?: boolean;
};

/**
 * Mirrors `repeat(auto-fit, minmax(minColumnWidth, 1fr))` without a gap, so
 * row parity computed here matches the rows the browser lays out. `auto-fit`
 * collapses tracks no tile fills, so a short list lays out fewer columns
 * than fit the width.
 */
const countGridColumns = (
  gridWidth: number,
  minColumnWidth: number,
  tileCount: number,
) => Math.max(1, Math.min(tileCount, Math.floor(gridWidth / minColumnWidth)));

const useGridWidth = () => {
  const gridRef = useRef<HTMLSpanElement>(null);
  const [gridWidth, setGridWidth] = useState(0);

  // Measured before the first paint: until the observer reports, the grid
  // would render as one column, without stripes and with the wrong row parity.
  useLayoutEffect(() => {
    const grid = gridRef.current;

    if (!grid) return;

    setGridWidth(grid.clientWidth);

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

  const columnCount = countGridColumns(
    gridWidth,
    minColumnWidth,
    timers.length,
  );

  // A stripe marks where each tile starts among its row neighbours; a single
  // column has none, and a run of one colour would read as one long bar.
  const showColorStripe = columnCount > 1;

  return (
    <TimerMapPresenceProvider timers={timers}>
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
                key={
                  timer.mergedGuildIds
                    ? `${timer.world}-${getTimerGroupingKey(timer)}`
                    : `${timer.world}-${timer.guildId}-${timer.timerKey}`
                }
                guildIds={guildIds}
                guildNamesById={guildNamesById}
                accessPolicy={accessPoliciesByGuildId[timer.guildId]}
                timer={timer}
                settingsKey={settingsKey}
                isHidden={isHidden}
                isAlternateRow={!legacyAppearance && isAlternateRow}
                showColorStripe={showColorStripe}
              />
            );
          })}
        </span>
      </TimerClockProvider>
    </TimerMapPresenceProvider>
  );
};
