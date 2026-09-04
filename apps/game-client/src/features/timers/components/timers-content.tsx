import type { FC } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GuildSwitcher } from "@/components/guild-switcher";
import { WorldSelector } from "@/components/world-selector";
import { TimersFilters } from "./timers-filters";
import { TimersGrid } from "./timers-grid";
import { TimersEmptyState } from "./timers-empty-state";
import { TimersFooter } from "./timers-footer";
import type { TimerWithTimeLeft } from "../utils/timers-utils";
import { cn } from "cn";
import { AsyncContent } from "@/components/async-content";
import { useTranslation } from "react-i18next";
import { AsyncStatusIndicator } from "@/components/async-status-indicator";

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
  onResetFilters: () => void;
  world?: string;
  compactView?: boolean;
  error?: unknown;
  initialLoading?: boolean;
  onRetry?: () => void;
  refreshError?: boolean;
  refreshing?: boolean;
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
  onResetFilters,
  world,
  compactView = false,
  error = null,
  initialLoading = false,
  onRetry,
  refreshError = false,
  refreshing = false,
}) => {
  const { t } = useTranslation(["timers", "common"]);

  return (
    <span
      className={cn(
        "ll:relative ll:h-full ll:flex ll:flex-1 ll:flex-col ll:box-border ll:pt-1 ll:w-full",
        {
          "ll:pt-0! ll:h-[calc(100%-2rem)]": isUnderBag,
        },
      )}
    >
      <div className="ll:pointer-events-auto ll:absolute ll:right-1 ll:top-1 ll:z-20">
        <AsyncStatusIndicator
          active={refreshError}
          kind="error"
          label={t("states.refreshError")}
          onRetry={onRetry}
          retryLabel={t("actions.retry", { ns: "common" })}
        />
        <AsyncStatusIndicator
          active={!refreshError && refreshing}
          delay
          kind="loading"
          label={t("states.refreshing")}
        />
      </div>
      {!compactView && !isGrouping && <GuildSwitcher className="ll:mb-1!" />}
      {!compactView && allowWorldSelection && !isGrouping && <WorldSelector />}
      {!compactView && timerFiltersEnabled && (
        <TimersFilters filtersKey={settingsKey} />
      )}

      <div className="ll:flex ll:min-h-0 ll:flex-1 ll:w-full ll:py-1">
        <AsyncContent
          error={error}
          errorLabel={t("states.loadError")}
          isLoading={initialLoading}
          loadingLabel={t("states.loading")}
          onRetry={onRetry}
          retryLabel={t("actions.retry", { ns: "common" })}
        >
          {sortedTimers.length === 0 ? (
            <TimersEmptyState
              areFiltersActive={areFiltersActive}
              onResetFilters={onResetFilters}
            />
          ) : (
            <ScrollArea
              data-testid="timers-scroll-container"
              className="ll:h-full ll:w-full! ll:py-1"
            >
              <TimersGrid
                timers={sortedTimers}
                settingsKey={settingsKey}
                hiddenTimers={hiddenTimers}
                minColumnWidth={minColumnWidth}
              />
            </ScrollArea>
          )}
        </AsyncContent>
      </div>

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
