import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { parseMsToTime } from "@lootlog/ui/lib/date-utils";
import { cn } from "@/utils/cn";
import type { EventTimer } from "../../types/api";
import type { TFunction } from "i18next";

interface HeroTimerDisplayProps {
  timer: EventTimer | undefined;
  t: TFunction;
  className?: string;
}

const getHeroTimerTimeLeft = (timer: EventTimer) =>
  new Date(timer.maxSpawnTime).getTime() - Date.now();

function formatNegativeElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => String(n).padStart(2, "0");

  if (hours > 0) {
    return `-${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `-${minutes}:${pad(seconds)}`;
}

export const HeroTimerDisplay = ({
  timer,
  t,
  className,
}: HeroTimerDisplayProps) => {
  if (!timer) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 text-[11px] text-muted-foreground whitespace-nowrap",
          className,
        )}
      >
        <Clock className="w-3 h-3" />
        {t("events.heroes.noTimer")}
      </span>
    );
  }

  return (
    <HeroTimerDisplayContent
      key={timer.maxSpawnTime}
      timer={timer}
      label={t("events.respawn.maxSpawnTime")}
      className={className}
    />
  );
};

const HeroTimerDisplayContent = ({
  timer,
  label,
  className,
}: {
  timer: EventTimer;
  label: string;
  className?: string;
}) => {
  const [timeLeft, setTimeLeft] = useState(() => getHeroTimerTimeLeft(timer));

  useEffect(() => {
    const maxSpawnTime = new Date(timer.maxSpawnTime).getTime();

    const interval = setInterval(() => {
      setTimeLeft(maxSpawnTime - Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [timer.maxSpawnTime]);

  const isOverdue = timeLeft <= 0;
  const isClose = !isOverdue && timeLeft < 60000;

  const displayTime = isOverdue
    ? formatNegativeElapsed(Math.abs(timeLeft))
    : parseMsToTime(timeLeft);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex items-center gap-1 text-[11px] font-medium whitespace-nowrap",
            isOverdue
              ? "text-orange-500"
              : isClose
                ? "text-orange-400"
                : "text-green-400",
            className,
          )}
        >
          <Clock className="w-3 h-3" />
          {displayTime}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-sm">
          {label}:{" "}
          {format(new Date(timer.maxSpawnTime), "HH:mm:ss", { locale: pl })}
        </p>
      </TooltipContent>
    </Tooltip>
  );
};
