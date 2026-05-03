import type { FC } from "react";
import { TimersColorStatistics } from "./timers-color-statistics";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TimersConnectionStatus } from "@/features/timers/components/timers-connection-status";
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
    <div className="ll:flex ll:items-center ll:pt-1 ll:pb-0.5 ll:px-1 ll:h-6 ll:w-full ll:box-border ll:relative">
      <TimersColorStatistics colorStatistics={colorStatistics} />
      <TimersConnectionStatus />
      {!isGrouping && guildId && world && (
        <div className="ll:absolute ll:right-1 ll:flex ll:items-center">
          <GlobalTimerHistoryPopover guildId={guildId} world={world} />
        </div>
      )}
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
        <TooltipContent side="top">{t("footer.addTimer")}</TooltipContent>
      </Tooltip>
    </div>
  );
};
