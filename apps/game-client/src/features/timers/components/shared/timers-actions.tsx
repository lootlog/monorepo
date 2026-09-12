import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  Eye,
  EyeOff,
  Filter,
  Palette,
} from "lucide-react";
import { WindowActionButton } from "@/components/window-action-button";
import type { TimersToolbarModel } from "@/features/timers/hooks/use-timers-window-model";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

const ICON_SIZE = 14;

type TimersActionsProps = {
  toolbar: TimersToolbarModel;
};

/** Filter, colour filter, sort and show-hidden toggles of a timers surface. */
export const TimersActions: FC<TimersActionsProps> = ({ toolbar }) => {
  const { t } = useTranslation("timers");

  const {
    filtersEnabled: timerFiltersEnabled,
    toggleFilters: toggleTimerFiltersEnabled,
    colorFiltersEnabled,
    toggleColorFilters: toggleColorFiltersEnabled,
    sortOrder: timersSortOrder,
    setSortOrder: setTimersSortOrder,
    showHidden: showHiddenTimers,
    setShowHidden: setShowHiddenTimers,
  } = toolbar;

  const isDescending = timersSortOrder === "desc";

  return (
    <>
      <WindowActionButton
        label={t(
          timerFiltersEnabled ? "toolbar.hideFilters" : "toolbar.showFilters",
        )}
        pressed={timerFiltersEnabled}
        onClick={toggleTimerFiltersEnabled}
      >
        <Filter size={ICON_SIZE} aria-hidden="true" />
      </WindowActionButton>
      <WindowActionButton
        label={t(
          colorFiltersEnabled
            ? "toolbar.disableColorFilters"
            : "toolbar.enableColorFilters",
        )}
        pressed={colorFiltersEnabled}
        onClick={toggleColorFiltersEnabled}
      >
        <Palette size={ICON_SIZE} aria-hidden="true" />
      </WindowActionButton>
      <WindowActionButton
        label={t(isDescending ? "toolbar.sortAsc" : "toolbar.sortDesc")}
        onClick={() => setTimersSortOrder(isDescending ? "asc" : "desc")}
      >
        {isDescending ? (
          <ArrowDownWideNarrow size={ICON_SIZE} aria-hidden="true" />
        ) : (
          <ArrowUpNarrowWide size={ICON_SIZE} aria-hidden="true" />
        )}
      </WindowActionButton>
      <WindowActionButton
        label={t(
          showHiddenTimers
            ? "toolbar.hideHiddenTimers"
            : "toolbar.showHiddenTimers",
        )}
        pressed={showHiddenTimers}
        onClick={() => setShowHiddenTimers(!showHiddenTimers)}
      >
        {showHiddenTimers ? (
          <Eye size={ICON_SIZE} aria-hidden="true" />
        ) : (
          <EyeOff size={ICON_SIZE} aria-hidden="true" />
        )}
      </WindowActionButton>
    </>
  );
};
