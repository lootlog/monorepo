import type { FC } from "react";
import { Filter, Palette, SortAsc, SortDesc, Eye, EyeOff } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";

type TimersUnderBagActionsProps = {
  timerFiltersEnabled: boolean;
  toggleTimerFiltersEnabled: () => void;
  colorFiltersEnabled?: boolean;
  toggleColorFiltersEnabled: () => void;
  timersSortOrder: "asc" | "desc";
  setTimersSortOrder: (order: "asc" | "desc") => void;
  showHiddenTimers: boolean;
  setShowHiddenTimers: (show: boolean) => void;
};

export const TimersUnderBagActions: FC<TimersUnderBagActionsProps> = ({
  timerFiltersEnabled,
  toggleTimerFiltersEnabled,
  colorFiltersEnabled,
  toggleColorFiltersEnabled,
  timersSortOrder,
  setTimersSortOrder,
  showHiddenTimers,
  setShowHiddenTimers,
}) => {
  const { t } = useTranslation("timers");
  return (
    <div className="ll:flex ll:gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Filter
            key="filters"
            className="ll-custom-cursor-pointer ll:-mt-0.5 ll:stroke-gray-300 ll:hover:stroke-gray-100 ll:transition-colors ll:h-5 ll:mb-1"
            size="14"
            onClick={toggleTimerFiltersEnabled}
          />
        </TooltipTrigger>
        <TooltipContent side="top">
          {timerFiltersEnabled
            ? t("toolbar.hideFilters")
            : t("toolbar.showFilters")}
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Palette
            key="color-filters"
            className={`ll-custom-cursor-pointer ll:-mt-0.5 ll:hover:stroke-gray-100 ll:transition-colors ll:h-5 ll:mb-1 ${
              colorFiltersEnabled
                ? "ll:stroke-blue-400 ll:fill-blue-400/20"
                : "ll:stroke-gray-300"
            }`}
            size="14"
            onClick={toggleColorFiltersEnabled}
          />
        </TooltipTrigger>
        <TooltipContent side="top">
          {colorFiltersEnabled
            ? t("toolbar.disableColorFilters")
            : t("toolbar.enableColorFilters")}
        </TooltipContent>
      </Tooltip>
      {timersSortOrder === "desc" ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <SortDesc
              key="sort-desc"
              className="ll-custom-cursor-pointer ll:mt-0.5 ll:stroke-gray-300 ll:hover:stroke-gray-100 ll:transition-colors"
              size="14"
              onClick={() => setTimersSortOrder("asc")}
            />
          </TooltipTrigger>
          <TooltipContent side="top">{t("toolbar.sortAsc")}</TooltipContent>
        </Tooltip>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <SortAsc
              key="sort-asc"
              className="ll-custom-cursor-pointer ll:mt-0.5 ll:stroke-gray-300 ll:hover:stroke-gray-100 ll:transition-colors"
              size="14"
              onClick={() => setTimersSortOrder("desc")}
            />
          </TooltipTrigger>
          <TooltipContent side="top">{t("toolbar.sortDesc")}</TooltipContent>
        </Tooltip>
      )}
      {showHiddenTimers ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Eye
              key="show-hidden"
              className="ll-custom-cursor-pointer ll:mt-0.5 ll:stroke-gray-300 ll:hover:stroke-gray-100 ll:transition-colors"
              size="14"
              onClick={() => setShowHiddenTimers(false)}
            />
          </TooltipTrigger>
          <TooltipContent side="top">
            {t("toolbar.hideHiddenTimers")}
          </TooltipContent>
        </Tooltip>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <EyeOff
              key="hide-hidden"
              className="ll-custom-cursor-pointer ll:mt-0.5 ll:stroke-gray-300 ll:hover:stroke-gray-100 ll:transition-colors"
              size="14"
              onClick={() => setShowHiddenTimers(true)}
            />
          </TooltipTrigger>
          <TooltipContent side="top">
            {t("toolbar.showHiddenTimers")}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
};
