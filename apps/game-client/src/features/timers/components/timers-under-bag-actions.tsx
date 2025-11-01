import type { FC } from "react";
import { Filter, SortAsc, SortDesc, Eye, EyeOff } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type TimersUnderBagActionsProps = {
  timerFiltersEnabled: boolean;
  toggleTimerFiltersEnabled: () => void;
  timersSortOrder: "asc" | "desc";
  setTimersSortOrder: (order: "asc" | "desc") => void;
  showHiddenTimers: boolean;
  setShowHiddenTimers: (show: boolean) => void;
};

export const TimersUnderBagActions: FC<TimersUnderBagActionsProps> = ({
  timerFiltersEnabled,
  toggleTimerFiltersEnabled,
  timersSortOrder,
  setTimersSortOrder,
  showHiddenTimers,
  setShowHiddenTimers,
}) => {
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
          {timerFiltersEnabled ? "Ukryj filtry" : "Pokaż filtry"}
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
          <TooltipContent side="top">Sortuj rosnąco</TooltipContent>
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
          <TooltipContent side="top">Sortuj malejąco</TooltipContent>
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
          <TooltipContent side="top">Ukryj ukryte timery</TooltipContent>
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
          <TooltipContent side="top">Pokaż ukryte timery</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
};
