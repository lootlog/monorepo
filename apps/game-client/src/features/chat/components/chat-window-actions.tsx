import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Filter, Pencil } from "lucide-react";
import type { FC } from "react";

export type ChatWindowActionsProps = {
  chatInputEnabled: boolean;
  toggleChatInputEnabled: () => void;
  filtersVisible: boolean;
  toggleFiltersVisible: () => void;
};

export const ChatWindowActions: FC<ChatWindowActionsProps> = ({
  chatInputEnabled,
  toggleChatInputEnabled,
  filtersVisible,
  toggleFiltersVisible,
}) => {
  return (
    <>
      <Tooltip key="filters-tooltip">
        <TooltipTrigger asChild>
          <Filter
            key="filters"
            className={`ll-custom-cursor-pointer ll:mt-0.5 ll:hover:stroke-gray-100 ll:transition-colors ${
              filtersVisible
                ? "ll:stroke-blue-400 ll:fill-blue-400/20"
                : "ll:stroke-gray-300"
            }`}
            size="14"
            onClick={toggleFiltersVisible}
          />
        </TooltipTrigger>
        <TooltipContent side="top">
          {filtersVisible ? "Ukryj filtry" : "Pokaż filtry"}
        </TooltipContent>
      </Tooltip>
      <Tooltip key="chat-input-tooltip">
        <TooltipTrigger asChild>
          <Pencil
            key="chat-input"
            className={`ll-custom-cursor-pointer ll:mt-0.5 ll:hover:stroke-gray-100 ll:transition-colors ${
              chatInputEnabled
                ? "ll:stroke-blue-400 ll:fill-blue-400/20"
                : "ll:stroke-gray-300"
            }`}
            size="14"
            onClick={toggleChatInputEnabled}
          />
        </TooltipTrigger>
        <TooltipContent side="top">
          {chatInputEnabled ? "Ukryj pole czatu" : "Pokaż pole czatu"}
        </TooltipContent>
      </Tooltip>
    </>
  );
};
