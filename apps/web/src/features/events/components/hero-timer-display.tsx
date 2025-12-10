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
import type { EventTimer } from "../hooks/queries/use-event-hero-timers";
import type { TFunction } from "i18next";

interface HeroTimerDisplayProps {
  timer: EventTimer | undefined;
  t: TFunction;
}

export const HeroTimerDisplay = ({ timer, t }: HeroTimerDisplayProps) => {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!timer) {
      setTimeLeft(null);
      return;
    }

    const maxSpawnTime = new Date(timer.maxSpawnTime).getTime();
    setTimeLeft(maxSpawnTime - Date.now());

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
  }, [timer]);

  if (!timer || timeLeft === null) {
    return (
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        <Clock className="w-3 h-3" />
        {t("events.heroes.noTimer")}
      </span>
    );
  }

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
