import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "cn";
import { AsyncContent } from "@/components/async-content";
import { AsyncStatusStack } from "@/components/async-status-stack";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getTimersDensityStyle } from "@/features/timers/model/timers-density";
import type { TimersLayoutProps } from "../timers-surface";
import { TimersActions } from "../shared/timers-actions";
import { TimersEmptyState } from "../shared/timers-empty-state";
import { ModernTimersFilters } from "./modern-timers-filters";
import { ModernTimersFooter } from "./modern-timers-footer";
import { ModernTimersGrid } from "./modern-timers-grid";
import { ModernTimersHeader } from "./modern-timers-header";

/**
 * The modern timers layout: an auto-fit tile grid framed by an optional
 * header, filters bar and footer, each switchable in the appearance settings.
 * Every size comes from density variables so one setting scales the surface.
 */
export const ModernTimersSurface: FC<TimersLayoutProps> = ({
  model,
  surface,
}) => {
  const { t } = useTranslation(["timers", "common"]);
  const { scope, list, async, appearance, toolbar, actions } = model;
  const { modern } = appearance;
  const isUnderBag = surface === "under-bag";
  const showHeader = modern.showHeader && !scope.isGrouping;
  const showFiltersBar = modern.showFiltersBar && toolbar.filtersEnabled;

  return (
    <div
      className={cn(
        "ll:relative ll:flex ll:h-full ll:min-h-0 ll:w-full ll:flex-1 ll:flex-col ll:text-(--ll-timers-font-size) ll:leading-(--ll-timers-line-height)",
        isUnderBag && "ll:h-[calc(100%-2rem)]",
      )}
      style={getTimersDensityStyle(modern)}
    >
      {isUnderBag && (
        <div className="ll:flex ll:h-7 ll:shrink-0 ll:items-center ll:gap-0.5">
          <TimersActions toolbar={toolbar} />
          <p className="ll:m-0 ll:min-w-0 ll:flex-1 ll:truncate ll:text-center ll:text-[12px] ll:leading-none ll:font-semibold ll:text-[beige] ll:[text-shadow:1px_1px_1px_black]">
            {t("underBag.title")}
          </p>
        </div>
      )}
      <AsyncStatusStack
        error={async.refreshError}
        errorLabel={t("states.refreshError")}
        refreshing={async.refreshing}
        refreshingLabel={t("states.refreshing")}
        onRetry={async.retry}
        retryLabel={t("actions.retry", { ns: "common" })}
      />
      {showHeader && (
        <ModernTimersHeader allowWorldSelection={scope.allowWorldSelection} />
      )}
      {showFiltersBar && (
        <div className="ll:shrink-0 ll:border-0 ll:border-t ll:border-solid ll:border-gray-400/40 ll:bg-black/20">
          <ModernTimersFilters
            filtersKey={scope.settingsKey}
            colors={appearance.colors}
            colorFiltersEnabled={toolbar.colorFiltersEnabled}
          />
        </div>
      )}

      <div className="ll:flex ll:min-h-0 ll:w-full ll:flex-1 ll:border-0 ll:border-t ll:border-solid ll:border-gray-400/40">
        <AsyncContent
          error={async.initialError}
          errorLabel={t("states.loadError")}
          isLoading={async.initialLoading}
          loadingLabel={t("states.loading")}
          onRetry={async.retry}
          retryLabel={t("actions.retry", { ns: "common" })}
        >
          {list.timers.length === 0 ? (
            <TimersEmptyState
              areFiltersActive={list.areFiltersActive}
              onResetFilters={actions.resetFilters}
            />
          ) : (
            <ScrollArea
              data-testid="timers-scroll-container"
              className="ll:h-full ll:w-full!"
            >
              <ModernTimersGrid model={model} />
            </ScrollArea>
          )}
        </AsyncContent>
      </div>

      {modern.showFooter && <ModernTimersFooter model={model} />}
    </div>
  );
};
