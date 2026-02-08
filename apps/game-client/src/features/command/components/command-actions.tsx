import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const CommandActions = () => {
  return [
    <Tooltip key="command-info-tooltip">
      <TooltipTrigger asChild>
        <Info
          className="ll-custom-cursor-pointer ll:mt-0.5 ll:stroke-gray-300 ll:hover:stroke-gray-100 ll:transition-colors"
          size="14"
        />
      </TooltipTrigger>
      <TooltipContent side="top">
        ! = powiadomienie, !grp = szukaj grupy
      </TooltipContent>
    </Tooltip>,
  ];
};
