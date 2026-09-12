import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "cn";
import { AsyncContent } from "@/components/async-content";
import { AsyncStatusStack } from "@/components/async-status-stack";
import { GuildSwitcher } from "@/components/guild-switcher";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WorldSelector } from "@/components/world-selector";
import type { TimersLayoutProps } from "../timers-surface";
import { TimersActions } from "../shared/timers-actions";
import { TimersEmptyState } from "../shared/timers-empty-state";
import { TimersFilters } from "../shared/timers-filters";
import { LegacyTimersFooter } from "./legacy-timers-footer";
import { LegacyTimersGrid } from "./legacy-timers-grid";

/** The original timers layout, kept as it was before the modern layout shipped. */
export const LegacyTimersSurface: FC<TimersLayoutProps> = ({
  model,
  surface,
}) => {
  const { t } = useTranslation(["timers", "common"]);
  const { scope, list, async, appearance, toolbar, actions } = model;
  const isUnderBag = surface === "under-bag";
  const { compactView } = appearance;
  const showChrome = !compactView;

  return (
    <>
      {isUnderBag && (
        <>
          <div className="ll:flex ll:gap-1">
            <TimersActions toolbar={toolbar} />
          </div>
          <div className="ll:bg-[0_0] ll:top-1 ll:leading-7 ll:-mt-1.5 ll-custom-cursor-pointer ll:absolute ll:left-1/2 ll:transform ll:-translate-x-1/2 ll:flex ll:gap-2 ll:items-center">
            <p className="ll:text-[12px] ll:text-[beige] ll:text-shadow-[1px_1px_1px_black]">
              {t("underBag.title")}
            </p>
          </div>
        </>
      )}
      <span
        className={cn(
          "ll:relative ll:h-full ll:flex ll:flex-1 ll:flex-col ll:pt-1 ll:w-full",
          { "ll:pt-0! ll:h-[calc(100%-2rem)]": isUnderBag },
        )}
      >
        <AsyncStatusStack
          error={async.refreshError}
          errorLabel={t("states.refreshError")}
          refreshing={async.refreshing}
          refreshingLabel={t("states.refreshing")}
          onRetry={async.retry}
          retryLabel={t("actions.retry", { ns: "common" })}
        />
        {showChrome && !scope.isGrouping && (
          <GuildSwitcher className="ll:mb-1!" />
        )}
        {showChrome && scope.allowWorldSelection && !scope.isGrouping && (
          <WorldSelector />
        )}
        {showChrome && toolbar.filtersEnabled && (
          <TimersFilters
            filtersKey={scope.settingsKey}
            colors={appearance.colors}
            colorFiltersEnabled={toolbar.colorFiltersEnabled}
          />
        )}

        <div className="ll:flex ll:min-h-0 ll:flex-1 ll:w-full ll:py-1">
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
                className="ll:h-full ll:w-full! ll:py-1"
              >
                <LegacyTimersGrid model={model} />
              </ScrollArea>
            )}
          </AsyncContent>
        </div>

        {showChrome && <LegacyTimersFooter model={model} />}
      </span>
    </>
  );
};
