import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { MARGONEM_CDN_NPCS_URL } from "@/constants/margonem";
import { format } from "date-fns";
import { ClockArrowDown, ClockArrowUp } from "lucide-react";
import { useEffect, useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/utils/cn";
import { parseMsToTime } from "@lootlog/types";
import { useTimers, type Timer } from "@/hooks/api/game-data/use-timers";

type SingleTimerProps = {
  timer: Timer;
};

const THRESHOLD = 30000;

export const SingleTimer: FC<SingleTimerProps> = ({ timer }) => {
  const { t } = useTranslation();
  const maxSpawnTime = new Date(timer.maxSpawnTime).getTime();
  const minSpawnTime = new Date(timer.minSpawnTime).getTime();

  const { refetch } = useTimers();
  const [timeLeft, setTimeLeft] = useState(() => maxSpawnTime - Date.now());
  const [minTimeLeft, setMinTimeLeft] = useState(
    () => minSpawnTime - Date.now(),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const time = maxSpawnTime - Date.now();
      const minTime = minSpawnTime - Date.now();

      if (time <= 0) {
        clearInterval(interval);
        setTimeLeft(0);
        refetch();

        return;
      }

      setTimeLeft(time);
      setMinTimeLeft(minTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [maxSpawnTime, minSpawnTime, refetch]);

  const isMinSpawnTime = minSpawnTime < maxSpawnTime && minTimeLeft <= 0;
  const hasPassedRedThreshold = timeLeft < THRESHOLD;
  const imageHasDomain = timer.npc.icon?.startsWith("https://"); // @TODO: temporary fix for icons with full URL

  return (
    <div className="group flex items-center gap-3 rounded-lg border border-border/50 bg-card/40 px-3 py-2.5 hover:bg-card/60 hover:border-primary/50 transition-all cursor-pointer">
      {timer.npc.icon && (
        <div className="size-8 shrink-0 flex items-center justify-center">
          {/* eslint-disable-next-line eslint-plugin-next/no-img-element */}
          <img
            className="rounded max-h-8 max-w-8"
            src={`${imageHasDomain ? "" : MARGONEM_CDN_NPCS_URL}${timer.npc.icon}`}
            alt={timer.npc.name}
          />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium truncate block">
          {timer.npc.name}
        </span>
        <span className="text-muted-foreground text-xs truncate block">
          {timer.member.name}
        </span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {!isMinSpawnTime && (
          <Tooltip>
            <TooltipTrigger>
              <span className="text-xs flex items-center gap-1 tabular-nums text-muted-foreground">
                <ClockArrowDown size="14px" />
                {parseMsToTime(minTimeLeft)}
              </span>
            </TooltipTrigger>
            <TooltipContent className="flex flex-col">
              <span className="text-sm">
                {t("timers.details.minSpawnTime")}
              </span>
              <span className="text-sm font-semibold">
                {format(new Date(minSpawnTime), "dd.MM.yyyy - HH:mm:ss")}
              </span>
            </TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger>
            <span
              className={cn(
                "text-xs flex items-center gap-1 tabular-nums font-medium",
                {
                  "text-orange-400": isMinSpawnTime,
                  "text-red-500": hasPassedRedThreshold,
                },
              )}
            >
              <ClockArrowUp size="14px" />
              {parseMsToTime(timeLeft)}
            </span>
          </TooltipTrigger>
          <TooltipContent className="flex flex-col">
            <span className="text-sm">{t("timers.details.maxSpawnTime")}</span>
            <span className="text-sm font-semibold">
              {format(new Date(maxSpawnTime), "dd.MM.yyyy - HH:mm:ss")}
            </span>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
};
