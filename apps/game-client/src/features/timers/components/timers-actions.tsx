import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  Eye,
  EyeOff,
  Filter,
  Palette,
} from "lucide-react";
import { WindowActionButton } from "@/components/window-action-button";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

const ICON_SIZE = 14;

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
