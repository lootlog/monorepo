import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { parseMsToTime } from "@/utils/date/parse-ms-to-time";
import { cn } from "@/utils/cn";
import type { EventTimer } from "../../hooks/queries/use-event-hero-timers";
import type { TFunction } from "i18next";

interface HeroTimerDisplayProps {
  timer: EventTimer | undefined;
  t: TFunction;
}

const getHeroTimerTimeLeft = (timer: EventTimer) =>
  Math.max(0, new Date(timer.maxSpawnTime).getTime() - Date.now());

export const HeroTimerDisplay = ({ timer, t }: HeroTimerDisplayProps) => {
  if (!timer) {
    return (
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        <Clock className="w-3 h-3" />
        {t("events.heroes.noTimer")}
      </span>
    );
  }

  return <HeroTimerDisplayContent key={timer.maxSpawnTime} timer={timer} />;
};

const HeroTimerDisplayContent = ({ timer }: { timer: EventTimer }) => {
  const [timeLeft, setTimeLeft] = useState(() => getHeroTimerTimeLeft(timer));

  useEffect(() => {
    const maxSpawnTime = new Date(timer.maxSpawnTime).getTime();

    const interval = setInterval(() => {
      const time = maxSpawnTime - Date.now();
      if (time <= 0) {
        clearInterval(interval);
        setTimeLeft(0);
        return;
      }
      setTimeLeft(time);
    }, 1000);

    return () => clearInterval(interval);
  }, [timer.maxSpawnTime]);

  const isClose = timeLeft < 60000;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "text-xs flex items-center gap-1 font-medium",
            isClose ? "text-orange-400" : "text-green-400",
          )}
        >
          <Clock className="w-3 h-3" />
          {parseMsToTime(timeLeft)}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-sm">
          Max spawn:{" "}
          {format(new Date(timer.maxSpawnTime), "HH:mm:ss", { locale: pl })}
        </p>
      </TooltipContent>
    </Tooltip>
  );
};
