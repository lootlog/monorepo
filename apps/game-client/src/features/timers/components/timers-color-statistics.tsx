import type { FC } from "react";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TIMERS_COLORS } from "@/features/timers/constants/timer-colors";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

type ColorStat = {
  color: string;
  total: number;
  active: number;
  name: string;
  bgColor?: string;
  borderColor?: string;
};

type TimersColorStatisticsProps = {
  colorStatistics: ColorStat[];
};

export const TimersColorStatistics: FC<TimersColorStatisticsProps> = ({
  colorStatistics,
}) => {
  const { t } = useTranslation();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Info
          className="ll-custom-cursor-pointer ll:stroke-gray-400 ll:hover:stroke-gray-200 ll:transition-colors ll:absolute ll:left-1"
          size={14}
        />
      </TooltipTrigger>
      <TooltipContent side="top" className="ll:max-w-xs">
        <div className="ll:flex ll:flex-col ll:gap-1">
          <p className="ll:text-xs ll:font-semibold ll:mb-1">
            {t("timers.statistics.title")}
          </p>
          {colorStatistics.length === 0 ? (
            <p className="ll:text-xs ll:text-gray-400">
              {t("timers.statistics.empty")}
            </p>
          ) : (
            colorStatistics.map((stat) => {
              const defaultColor =
                TIMERS_COLORS[stat.color as keyof typeof TIMERS_COLORS];
              const hasCustomColors = stat.bgColor || stat.borderColor;

              return (
                <div
                  key={stat.color}
                  className="ll:flex ll:items-center ll:gap-2 ll:text-xs"
                >
                  <div
                    className={cn(
                      "ll:size-3 ll:rounded-sm ll:border",
                      !hasCustomColors && defaultColor?.bgNoOpacity,
                      !hasCustomColors && defaultColor?.border,
                    )}
                    style={
                      hasCustomColors
                        ? {
                            backgroundColor: stat.bgColor,
                            borderColor: stat.borderColor,
                          }
                        : undefined
                    }
                  />
                  <span className="ll:text-gray-200">
                    {stat.name}: {stat.active}/{stat.total}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
};
