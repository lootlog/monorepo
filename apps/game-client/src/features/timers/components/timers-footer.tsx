import type { FC } from "react";
import { cn } from "cn";
import { TimersColorStatistics } from "./timers-color-statistics";
import { Plus } from "lucide-react";
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
  className?: string;
  colorStatistics: ColorStat[];
  guildId?: string;
  isGrouping: boolean;
  onAddTimer: () => void;
  world?: string;
};

export const TimersFooter: FC<TimersFooterProps> = ({
  className,
  colorStatistics,
  guildId,
  isGrouping,
  onAddTimer,
  world,
}) => {
  const { t } = useTranslation("timers");

  return (
    <div
      className={cn(
        "ll:w-full ll:shrink-0 ll:border-t ll:border-x-0 ll:border-b-0 ll:border-gray-400/40",
        className,
      )}
    >
      <div className="ll:flex ll:h-7 ll:items-center ll:justify-between ll:px-1.5">
        <TimersColorStatistics colorStatistics={colorStatistics} />
        <div className="ll:flex ll:items-center ll:gap-1">
          {!isGrouping && guildId && world && (
            <GlobalTimerHistoryPopover guildId={guildId} world={world} />
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={t("footer.addTimer")}
                onClick={onAddTimer}
                className="ll-custom-cursor-pointer ll:inline-flex ll:size-6 ll:items-center ll:justify-center ll:rounded-sm ll:border ll:border-solid ll:border-gray-400/40 ll:bg-zinc-800 ll:p-0 ll:text-gray-200 ll:transition-colors ll:motion-reduce:transition-none ll:hover:bg-zinc-700 ll:hover:text-white ll:focus-visible:outline ll:focus-visible:outline-2 ll:focus-visible:outline-blue-400"
              >
                <Plus size={14} aria-hidden="true" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">{t("footer.addTimer")}</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};
