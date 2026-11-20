import { subscribeToSecondClock } from "@/hooks/utils/second-clock";
import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { parseMsToTime } from "@lootlog/datetime";
import { cn } from "cn";
import type { EventTimer } from "@/lib/api/event-types";
import { formatTime } from "../../utils/format-date";
import type { TFunction } from "i18next";
import { formatDuration } from "@/utils/date/format-duration";

interface HeroTimerDisplayProps {
  timer: EventTimer | undefined;
  t: TFunction;
  className?: string;
}

const getHeroTimerTimeLeft = (timer: EventTimer) =>
  new Date(timer.maxSpawnTime).getTime() - Date.now();

export const HeroTimerDisplay = ({
  timer,
  t,
  className,
}: HeroTimerDisplayProps) => {
  if (!timer) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 text-2xs text-muted-foreground whitespace-nowrap",
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

    return subscribeToSecondClock(() => {
      setTimeLeft(maxSpawnTime - Date.now());
    });
  }, [timer.maxSpawnTime]);

  const isOverdue = timeLeft <= 0;
  const isClose = !isOverdue && timeLeft < 60000;

  const displayTime = isOverdue
    ? `-${formatDuration(Math.floor(Math.abs(timeLeft) / 1000), "clock")}`
    : parseMsToTime(timeLeft);

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className={cn(
              "inline-flex items-center gap-1 text-2xs font-medium whitespace-nowrap",
              isOverdue
                ? "text-signal-alert"
                : isClose
                  ? "text-signal-timer"
                  : "text-signal-ready",
              className,
            )}
          >
            <Clock className="w-3 h-3" />
            {displayTime}
          </span>
        }
      />
      <TooltipContent>
        <p className="text-sm">
          {label}: {formatTime(new Date(timer.maxSpawnTime))}
        </p>
      </TooltipContent>
    </Tooltip>
  );
};
