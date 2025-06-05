import { Tooltip, TooltipContent, TooltipTrigger } from "components/ui/tooltip";
import { MARGONEM_CDN_NPCS_URL } from "constants/margonem";
import { format } from "date-fns";
import { Timer, useTimers } from "hooks/api/use-timers";
import { ClockArrowDown, ClockArrowUp } from "lucide-react";
import { FC, useEffect, useState } from "react";
import { cn } from "utils/cn";
import { parseMsToTime } from "utils/date/parse-ms-to-time";

type SingleTimerProps = {
  timer: Timer;
};

const THRESHOLD = 30000;

export const SingleTimer: FC<SingleTimerProps> = ({ timer }) => {
  const maxSpawnTime = new Date(timer.maxSpawnTime).getTime();
  const minSpawnTime = new Date(timer.minSpawnTime).getTime();

  const { refetch } = useTimers();
  const [timeLeft, setTimeLeft] = useState(maxSpawnTime - Date.now());
  const [minTimeLeft, setMinTimeLeft] = useState(minSpawnTime - Date.now());

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

  const isMinSpawnTime = minSpawnTime - Date.now() < 0;
  const hasPassedRedThreshold = timeLeft < THRESHOLD;
  const imageHasDomain = timer.npc.icon?.startsWith("https://"); // @TODO: temporary fix for icons with full URL

  return (
    <div className="flex flex-row justify-between px-2 py-2 gap-3 min-h-12 items-center hover:bg-accent cursor-pointer">
      <span
        className={cn(
          "font-semibold text-xs transition-all flex flex-row gap-2 items-center",
          {
            "text-orange-400": isMinSpawnTime,
            "text-red-500": hasPassedRedThreshold,
          }
        )}
      >
        {timer.npc.icon && (
          <div className="w-8">
            <img
              className={"relative cursor-pointer rounded-lg max-h-10 max-w-8"}
              src={`${imageHasDomain ? "" : MARGONEM_CDN_NPCS_URL}/${timer.npc.icon}`}
              alt={timer.npc.name}
            />
          </div>
        )}
        <div className="flex flex-col">
          <span className="text-sm">{timer.npc.name}</span>
          <span className="text-muted-foreground text-xs">
            Dodane przez: {timer.member.name}
          </span>
        </div>
      </span>
      <div className="flex flex-col items-end">
        {!isMinSpawnTime && (
          <Tooltip>
            <TooltipTrigger>
              <span className="text-xs flex flex-row items-center gap-1">
                <ClockArrowDown size="14px" />
                {parseMsToTime(minTimeLeft)}
              </span>
            </TooltipTrigger>
            <TooltipContent className="flex flex-col">
              <span className="text-sm">Min. czas spawnu:</span>
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
                "transition-all text-xs flex flex-row items-center gap-1",
                {
                  "text-orange-400": isMinSpawnTime,
                  "text-red-500": hasPassedRedThreshold,
                }
              )}
            >
              <ClockArrowUp size="14px" />
              {parseMsToTime(timeLeft)}
            </span>
          </TooltipTrigger>
          <TooltipContent className="flex flex-col">
            <span className="text-sm">Max. czas spawnu:</span>
            <span className="text-sm font-semibold">
              {format(new Date(maxSpawnTime), "dd.MM.yyyy - HH:mm:ss")}
            </span>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
};
