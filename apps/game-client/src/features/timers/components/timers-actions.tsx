import { Eye, EyeOff, Filter, Palette, SortAsc, SortDesc } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { TimersToolbarButton } from "./timers-toolbar-button";

type TimersActionsProps = {
  timerFiltersEnabled?: boolean;
  toggleTimerFiltersEnabled: () => void;
  colorFiltersEnabled?: boolean;
  toggleColorFiltersEnabled: () => void;
  timersSortOrder: "asc" | "desc";
  setTimersSortOrder: (order: "asc" | "desc") => void;
  showHiddenTimers: boolean;
  setShowHiddenTimers: (show: boolean) => void;
};

const ICON_SIZE = 14;

export const TimersActions: FC<TimersActionsProps> = ({
  timerFiltersEnabled = false,
  toggleTimerFiltersEnabled,
  colorFiltersEnabled = false,
  toggleColorFiltersEnabled,
  timersSortOrder,
  setTimersSortOrder,
  showHiddenTimers,
  setShowHiddenTimers,
}) => {
  const { t } = useTranslation("timers");
  const sortDesc = timersSortOrder === "desc";

  return (
    <>
      <TimersToolbarButton
        label={t(
          timerFiltersEnabled ? "toolbar.hideFilters" : "toolbar.showFilters",
        )}
        active={timerFiltersEnabled}
        onClick={toggleTimerFiltersEnabled}
        icon=<Filter size={ICON_SIZE} aria-hidden="true" />
      />
      <TimersToolbarButton
        label={t(
          colorFiltersEnabled
            ? "toolbar.disableColorFilters"
            : "toolbar.enableColorFilters",
        )}
        active={colorFiltersEnabled}
        onClick={toggleColorFiltersEnabled}
        icon=<Palette size={ICON_SIZE} aria-hidden="true" />
      />
      <TimersToolbarButton
        label={t(sortDesc ? "toolbar.sortAsc" : "toolbar.sortDesc")}
        onClick={() => setTimersSortOrder(sortDesc ? "asc" : "desc")}
        icon={
          sortDesc ? (
            <SortDesc size={ICON_SIZE} aria-hidden="true" />
          ) : (
            <SortAsc size={ICON_SIZE} aria-hidden="true" />
          )
        }
      />
      <TimersToolbarButton
        label={t(
          showHiddenTimers
            ? "toolbar.hideHiddenTimers"
            : "toolbar.showHiddenTimers",
        )}
        active={showHiddenTimers}
        onClick={() => setShowHiddenTimers(!showHiddenTimers)}
        icon={
          showHiddenTimers ? (
            <Eye size={ICON_SIZE} aria-hidden="true" />
          ) : (
            <EyeOff size={ICON_SIZE} aria-hidden="true" />
          )
        }
      />
    </>
  );
};
