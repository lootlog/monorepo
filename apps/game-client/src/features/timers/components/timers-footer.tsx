import type { FC } from "react";
import { TimersColorStatistics } from "./timers-color-statistics";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ColorStat = {
  color: string;
  total: number;
  active: number;
  name: string;
  bgColor?: string;
  borderColor?: string;
};

type TimersFooterProps = {
  colorStatistics: ColorStat[];
  onAddTimer: () => void;
};

export const TimersFooter: FC<TimersFooterProps> = ({
  colorStatistics,
  onAddTimer,
}) => {
  return (
    <div className="ll:flex ll:items-center ll:pt-1 ll:pb-0.5 ll:px-1 ll:h-6 ll:w-full ll:box-border ll:relative">
      <TimersColorStatistics colorStatistics={colorStatistics} />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            className="ll:text-[12px] ll:border ll:border-gray-400 ll:px-4 ll-custom-cursor-pointer ll:mx-auto"
            onClick={onAddTimer}
          >
            +
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">Dodaj timer</TooltipContent>
      </Tooltip>
    </div>
  );
};
