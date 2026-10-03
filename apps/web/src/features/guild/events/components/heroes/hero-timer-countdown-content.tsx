import { subscribeToSecondClock } from "@/hooks/utils/second-clock";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { cn } from "cn";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { parseMsToTime } from "@lootlog/datetime";
import type { EventTimer } from "../../types/api";
import { getHeroTimerCountdownState } from "./hero-timer-countdown-state";
import { formatTime } from "../../utils/format-date";

export const HeroTimerCountdownContent = ({ timer }: { timer: EventTimer }) => {
  const { t } = useTranslation();

  const [countdownState, setCountdownState] = useState(() =>
    getHeroTimerCountdownState(timer, Date.now()),
  );

  useEffect(() => {
    const unsubscribe = subscribeToSecondClock(() => {
      const nextCountdownState = getHeroTimerCountdownState(timer, Date.now());
      setCountdownState(nextCountdownState);

      if (nextCountdownState.phase === "expired") {
        unsubscribe();
      }
    });

    return unsubscribe;
  }, [timer]);

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
          <button
            type="button"
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-md text-sm font-medium",
              isWaiting
                ? "bg-signal-timer/10 text-signal-timer"
                : "bg-signal-ready/10 text-signal-ready",
            )}
          >
            <Clock className="w-4 h-4" />
            <span className="font-mono">
              {parseMsToTime(countdownState.timeLeftMilliseconds)}
            </span>
          </button>
        }
      />
      <TooltipContent>
        <div className="text-sm space-y-1">
          <p>
            {t("events.respawn.minSpawnTime")}:{" "}
            {formatTime(new Date(timer.minSpawnTime))}
          </p>
          <p>
            {t("events.respawn.maxSpawnTime")}:{" "}
            {formatTime(new Date(timer.maxSpawnTime))}
          </p>
          <p
            className={cn(
              "font-medium",
              isWaiting ? "text-signal-timer" : "text-signal-ready",
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
