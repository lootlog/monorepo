import { Eye, EyeOff, Filter, SortAsc, SortDesc } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { FC } from "react";

type TimersActionsProps = {
  timerFiltersEnabled?: boolean;
  toggleTimerFiltersEnabled: () => void;
  timersSortOrder: "asc" | "desc";
  setTimersSortOrder: (order: "asc" | "desc") => void;
  showHiddenTimers: boolean;
  setShowHiddenTimers: (show: boolean) => void;
};

export const TimersActions: FC<TimersActionsProps> = ({
  timerFiltersEnabled,
  toggleTimerFiltersEnabled,
  timersSortOrder,
  setTimersSortOrder,
  showHiddenTimers,
  setShowHiddenTimers,
}) => {
  return [
    <Tooltip key="filters-tooltip">
      <TooltipTrigger asChild>
        <Filter
          key="filters"
          className="ll-custom-cursor-pointer ll:mt-0.5 ll:stroke-gray-300 ll:hover:stroke-gray-100 ll:transition-colors"
          size="14"
          onClick={toggleTimerFiltersEnabled}
        />
      </TooltipTrigger>
      <TooltipContent side="top">
        {timerFiltersEnabled ? "Ukryj filtry" : "Pokaż filtry"}
      </TooltipContent>
    </Tooltip>,

    timersSortOrder === "desc" ? (
      <Tooltip key="sort-desc-tooltip">
        <TooltipTrigger asChild>
          <SortDesc
            key="sort-desc"
            className="ll-custom-cursor-pointer ll:mt-0.5 ll:stroke-gray-300 ll:hover:stroke-gray-100 ll:transition-colors"
            size="14"
            onClick={() => setTimersSortOrder("asc")}
          />
        </TooltipTrigger>
        <TooltipContent side="top">Sortuj rosnąco</TooltipContent>
      </Tooltip>
    ) : (
      <Tooltip key="sort-asc-tooltip">
        <TooltipTrigger asChild>
          <SortAsc
            key="sort-asc"
            className="ll-custom-cursor-pointer ll:mt-0.5 ll:stroke-gray-300 ll:hover:stroke-gray-100 ll:transition-colors"
            size="14"
            onClick={() => setTimersSortOrder("desc")}
          />
        </TooltipTrigger>
        <TooltipContent side="top">Sortuj malejąco</TooltipContent>
      </Tooltip>
    ),

    showHiddenTimers ? (
      <Tooltip key="show-hidden-tooltip">
        <TooltipTrigger asChild>
          <Eye
            key="show-hidden"
            className="ll-custom-cursor-pointer ll:mt-0.5 ll:stroke-gray-300 ll:hover:stroke-gray-100 ll:transition-colors"
            size="14"
            onClick={() => setShowHiddenTimers(false)}
          />
        </TooltipTrigger>
        <TooltipContent side="top">Ukryj ukryte timery</TooltipContent>
      </Tooltip>
    ) : (
      <Tooltip key="hide-hidden-tooltip">
        <TooltipTrigger asChild>
          <EyeOff
            key="hide-hidden"
            className="ll-custom-cursor-pointer ll:mt-0.5 ll:stroke-gray-300 ll:hover:stroke-gray-100 ll:transition-colors"
            size="14"
            onClick={() => setShowHiddenTimers(true)}
          />
        </TooltipTrigger>
        <TooltipContent side="top">Pokaż ukryte timery</TooltipContent>
      </Tooltip>
    ),
  ];
};
