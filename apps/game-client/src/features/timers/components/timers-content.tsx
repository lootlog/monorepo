import type { FC } from "react";
import { NativeScrollArea } from "@/components/ui/native-scroll-area";
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
  guildId?: string;
  isGrouping: boolean;
  allowWorldSelection: boolean;
  timerFiltersEnabled: boolean;
  isUnderBag: boolean;
  minColumnWidth: number;
  onAddTimer: () => void;
  world?: string;
  compactView?: boolean;
};

export const TimersContent: FC<TimersContentProps> = ({
  sortedTimers,
  settingsKey,
  hiddenTimers,
  areFiltersActive,
  colorStatistics,
  guildId,
  isGrouping,
  allowWorldSelection,
  timerFiltersEnabled,
  isUnderBag,
  minColumnWidth,
  onAddTimer,
  world,
  compactView = false,
}) => {
  return (
    <span
      className={cn(
        "ll:h-full ll:flex ll:flex-1 ll:flex-col ll:box-border ll:pt-1 ll:w-full",
        {
          "ll:pt-0! ll:h-[calc(100%-2rem)]": isUnderBag,
        },
      )}
    >
      {!compactView && !isGrouping && <GuildSwitcher className="ll:mb-1!" />}
      {!compactView && allowWorldSelection && !isGrouping && <WorldSelector />}
      {!compactView && timerFiltersEnabled && (
        <TimersFilters filtersKey={settingsKey} />
      )}

      <NativeScrollArea
        data-testid="timers-scroll-container"
        className="ll:flex-1 ll:w-full! ll:py-1"
      >
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
      </NativeScrollArea>

      {!compactView && (
        <TimersFooter
          colorStatistics={colorStatistics}
          guildId={guildId}
          isGrouping={isGrouping}
          onAddTimer={onAddTimer}
          world={world}
        />
      )}
    </span>
  );
};
