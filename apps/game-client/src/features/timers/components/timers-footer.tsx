import type { FC } from "react";
import { TimersColorStatistics } from "./timers-color-statistics";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";
import { GlobalTimerHistoryPopover } from "./global-timer-history-popover";

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
  guildId?: string;
  isGrouping: boolean;
  onAddTimer: () => void;
  world?: string;
};

export const TimersFooter: FC<TimersFooterProps> = ({
  colorStatistics,
  guildId,
  isGrouping,
  onAddTimer,
  world,
}) => {
  const { t } = useTranslation("timers");

  return (
    <div className="ll:grid ll:h-8 ll:w-full ll:shrink-0 ll:grid-cols-[1fr_auto_1fr] ll:items-center ll:border-t ll:border-x-0 ll:border-b-0 ll:border-gray-400/40 ll:px-1.5">
      <div className="ll:flex ll:items-center ll:justify-start">
        <TimersColorStatistics colorStatistics={colorStatistics} />
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="secondary"
            size="xs"
            type="button"
            className="ll:text-[12px] ll:border ll:border-gray-400 ll:px-4 ll-custom-cursor-pointer"
            onClick={onAddTimer}
          >
            +
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">{t("footer.addTimer")}</TooltipContent>
      </Tooltip>
      <div className="ll:flex ll:items-center ll:justify-end">
        {!isGrouping && guildId && world && (
          <GlobalTimerHistoryPopover guildId={guildId} world={world} />
        )}
      </div>
    </div>
  );
};
