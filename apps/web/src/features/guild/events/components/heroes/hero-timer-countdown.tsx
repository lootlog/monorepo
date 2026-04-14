import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { cn } from "@lootlog/ui/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { parseMsToTime } from "@lootlog/types";
import type { EventTimer } from "../../types/api";

interface HeroTimerCountdownProps {
  timer: EventTimer | undefined;
}

const getHeroTimerCountdown = (timer: EventTimer) => {
  const now = Date.now();
  const minSpawnTime = new Date(timer.minSpawnTime).getTime();
  const maxSpawnTime = new Date(timer.maxSpawnTime).getTime();

  if (now < minSpawnTime) {
    return minSpawnTime - now;
  }

  if (now < maxSpawnTime) {
    return maxSpawnTime - now;
  }

  return 0;
};

export const HeroTimerCountdown = ({ timer }: HeroTimerCountdownProps) => {
  const { t } = useTranslation();
  if (!timer) {
    return (
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        <Clock className="w-3 h-3" />
        {t("events.heroes.noTimer", "Brak timera")}
      </span>
    );
  }

  return (
    <HeroTimerCountdownContent
      key={`${timer.minSpawnTime}:${timer.maxSpawnTime}`}
      timer={timer}
    />
  );
};

const HeroTimerCountdownContent = ({ timer }: { timer: EventTimer }) => {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState(() => getHeroTimerCountdown(timer));

  useEffect(() => {
    const minSpawnTime = new Date(timer.minSpawnTime).getTime();
    const maxSpawnTime = new Date(timer.maxSpawnTime).getTime();

    const interval = setInterval(() => {
      const currentTime = Date.now();
      if (currentTime < minSpawnTime) {
        setTimeLeft(minSpawnTime - currentTime);
      } else if (currentTime < maxSpawnTime) {
        setTimeLeft(maxSpawnTime - currentTime);
      } else {
        clearInterval(interval);
        setTimeLeft(0);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timer.maxSpawnTime, timer.minSpawnTime]);

  if (timeLeft <= 0) {
    return (
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        <Clock className="w-3 h-3" />
        {t("events.heroes.timerExpired", "Timer wygasł")}
      </span>
    );
  }

  const minSpawnTime = new Date(timer.minSpawnTime).getTime();
  const maxSpawnTime = new Date(timer.maxSpawnTime).getTime();
  const isInSpawnWindow = timeLeft <= maxSpawnTime - minSpawnTime;
  const isClose = timeLeft < 60000;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-md text-sm font-medium",
            isInSpawnWindow
              ? "bg-green-500/20 text-green-400"
              : isClose
                ? "bg-orange-500/20 text-orange-400"
                : "bg-primary/20 text-primary",
          )}
        >
          <Clock className="w-4 h-4" />
          <span className="font-mono">{parseMsToTime(timeLeft)}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-sm space-y-1">
          <p>
            Min:{" "}
            {format(new Date(timer.minSpawnTime), "HH:mm:ss", { locale: pl })}
          </p>
          <p>
            Max:{" "}
            {format(new Date(timer.maxSpawnTime), "HH:mm:ss", { locale: pl })}
          </p>
          {isInSpawnWindow && (
            <p className="text-green-400 font-medium">
              {t("events.heroes.inSpawnWindow", "W oknie respawnu!")}
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
};
