import type { FC, ReactNode } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GuildSwitcher } from "@/components/guild-switcher";
import { WorldSelector } from "@/components/world-selector";
import { TimersFilters } from "./timers-filters";
import { TimersGrid } from "./timers-grid";
import { TimersEmptyState } from "./timers-empty-state";
import type { TimerWithTimeLeft } from "../utils/timers-utils";
import { cn } from "cn";
import {
  toolbarStripBleedClassName,
  toolbarStripClassName,
} from "@/components/ui/toolbar-strip";
import { AsyncContent } from "@/components/async-content";
import { useTranslation } from "react-i18next";
import { ConnectionStatusStrip } from "@/components/connection-status-strip";

type TimersContentProps = {
  sortedTimers: TimerWithTimeLeft[];
  settingsKey: string;
  hiddenTimers: string[];
  areFiltersActive: boolean;
  isGrouping: boolean;
  allowWorldSelection: boolean;
  timerFiltersEnabled: boolean;
  isUnderBag: boolean;
  minColumnWidth: number;
  legacyAppearance?: boolean;
  onResetFilters: () => void;
  compactView?: boolean;
  error?: unknown;
  initialLoading?: boolean;
  onRetry?: () => void;
  refreshError?: boolean;
  refreshing?: boolean;
  stale?: boolean;
  /** Covers the strips and the list, e.g. the add timer panel. */
  overlay?: ReactNode;
};

export const TimersContent: FC<TimersContentProps> = ({
  sortedTimers,
  settingsKey,
  hiddenTimers,
  areFiltersActive,
  isGrouping,
  allowWorldSelection,
  timerFiltersEnabled,
  isUnderBag,
  minColumnWidth,
  legacyAppearance = false,
  onResetFilters,
  compactView = false,
  error = null,
  initialLoading = false,
  onRetry,
  refreshError = false,
  refreshing = false,
  stale = false,
  overlay,
}) => {
  const { t } = useTranslation(["timers", "common"]);

  return (
    <span
      className={cn(
        "ll:relative ll:h-full ll:flex ll:flex-1 ll:flex-col ll:pt-1 ll:w-full",
        {
          // The strips bleed 4px past their container, the same as they do
          // through the window padding; pull the whole content out by that
          // much so the list and the add timer overlay line up with them.
          "ll:pt-0! ll:h-auto ll:min-h-0 ll:-mx-1 ll:w-auto": isUnderBag,
        },
      )}
    >
      <div className="ll:flex ll:flex-col ll:px-1">
        {!compactView && !isGrouping && (
          <div
            className={cn(toolbarStripBleedClassName, toolbarStripClassName)}
          >
            <GuildSwitcher />
          </div>
        )}
        {!compactView && allowWorldSelection && !isGrouping && (
          <WorldSelector
            className={toolbarStripBleedClassName}
            variant="strip"
          />
        )}
        {!compactView && timerFiltersEnabled && (
          <TimersFilters filtersKey={settingsKey} />
        )}
        <ConnectionStatusStrip
          className={toolbarStripBleedClassName}
          error={refreshError}
          errorLabel={t("states.refreshError")}
          offline={stale}
          offlineLabel={t("states.offline")}
          refreshing={refreshing}
          refreshingLabel={t("states.refreshing")}
          onRetry={onRetry}
        />
      </div>

      <div
        className={cn(
          "ll:flex ll:min-h-0 ll:flex-1 ll:w-full",
          legacyAppearance && "ll:px-1",
        )}
      >
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
              className={cn(
                "ll:h-full ll:w-full!",
                legacyAppearance && "ll:pt-1",
              )}
            >
              <TimersGrid
                timers={sortedTimers}
                settingsKey={settingsKey}
                hiddenTimers={hiddenTimers}
                minColumnWidth={minColumnWidth}
                legacyAppearance={legacyAppearance}
              />
            </ScrollArea>
          )}
        </AsyncContent>
      </div>
      {overlay}
    </span>
  );
};
