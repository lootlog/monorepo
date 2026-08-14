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
import { parseMsToTime } from "@/utils/date/parse-ms-to-time";
import type { EventTimer } from "../../types/api";
import { getHeroTimerCountdownState } from "./hero-timer-countdown-state";

interface HeroTimerCountdownProps {
  timer: EventTimer | undefined;
}

export const HeroTimerCountdown = ({ timer }: HeroTimerCountdownProps) => {
  const { t } = useTranslation();
  if (!timer) {
    return (
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        <Clock className="w-3 h-3" />
        {t("events.heroes.noTimer")}
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
  const [countdownState, setCountdownState] = useState(() =>
    getHeroTimerCountdownState(timer, Date.now()),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const nextCountdownState = getHeroTimerCountdownState(timer, Date.now());
      setCountdownState(nextCountdownState);

      if (nextCountdownState.phase === "expired") {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timer.maxSpawnTime, timer.minSpawnTime]);

  if (countdownState.phase === "expired") {
    return (
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        <Clock className="w-3 h-3" />
        {t("events.heroes.timerExpired")}
      </span>
    );
  }

  const isWaiting = countdownState.phase === "waiting";

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div
            tabIndex={0}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-md text-sm font-medium",
              isWaiting
                ? "bg-amber-500/10 text-amber-500"
                : "bg-green-500/10 text-green-500",
            )}
          >
            <Clock className="w-4 h-4" />
            <span className="font-mono">
              {parseMsToTime(countdownState.timeLeftMilliseconds)}
            </span>
          </div>
        }
      />
      <TooltipContent>
        <div className="text-sm space-y-1">
          <p>
            {t("events.respawn.minSpawnTime")}:{" "}
            {format(new Date(timer.minSpawnTime), "HH:mm:ss", { locale: pl })}
          </p>
          <p>
            {t("events.respawn.maxSpawnTime")}:{" "}
            {format(new Date(timer.maxSpawnTime), "HH:mm:ss", { locale: pl })}
          </p>
          <p
            className={cn(
              "font-medium",
              isWaiting ? "text-amber-500" : "text-green-500",
            )}
          >
            {isWaiting
              ? t("events.heroes.countdownUntilSpawnWindow")
              : t("events.heroes.countdownUntilSpawnWindowEnd")}
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};
