import type { FC } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GuildSwitcher } from "@/components/guild-switcher";
import { WorldSelector } from "@/components/world-selector";
import { TimersFilters } from "./timers-filters";
import { TimersGrid } from "./timers-grid";
import { TimersEmptyState } from "./timers-empty-state";
import { TimersFooter } from "./timers-footer";
import type { TimerWithTimeLeft } from "../utils/timers-utils";
import { cn } from "@/lib/utils";

type ColorStat = {
  color: string;
  total: number;
  active: number;
  name: string;
  bgColor?: string;
  borderColor?: string;
};

type TimersContentProps = {
  sortedTimers: TimerWithTimeLeft[];
  settingsKey: string;
  hiddenTimers: string[];
  areFiltersActive: boolean;
  colorStatistics: ColorStat[];
  isGrouping: boolean;
  allowWorldSelection: boolean;
  timerFiltersEnabled: boolean;
  isUnderBag: boolean;
  minColumnWidth: number;
  onAddTimer: () => void;
};

export const TimersContent: FC<TimersContentProps> = ({
  sortedTimers,
  settingsKey,
  hiddenTimers,
  areFiltersActive,
  colorStatistics,
  isGrouping,
  allowWorldSelection,
  timerFiltersEnabled,
  isUnderBag,
  minColumnWidth,
  onAddTimer,
}) => {
  return (
    <span
      className={cn(
        "ll:h-full ll:flex ll:flex-1 ll:flex-col ll:box-border ll:pt-1 ll:w-full",
        {
          "ll:pt-0!": isUnderBag,
          "ll:max-h-[376px]": isUnderBag,
        },
      )}
    >
      {!isGrouping && <GuildSwitcher className="ll:mb-1!" />}
      {allowWorldSelection && !isGrouping && <WorldSelector />}
      {timerFiltersEnabled && <TimersFilters filtersKey={settingsKey} />}

      <ScrollArea className="ll:py-1 ll:w-full! ll:flex-1" type="hover">
        {sortedTimers.length === 0 ? (
          <TimersEmptyState areFiltersActive={areFiltersActive} />
        ) : (
          <TimersGrid
            timers={sortedTimers}
            settingsKey={settingsKey}
            hiddenTimers={hiddenTimers}
            minColumnWidth={minColumnWidth}
          />
        )}
      </ScrollArea>

      <TimersFooter colorStatistics={colorStatistics} onAddTimer={onAddTimer} />
    </span>
  );
};
