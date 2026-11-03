import type { TimerResponseDto } from "@lootlog/client/main";
import {
  getTimerPhase,
  getTimerTimeLeft,
  type TimerCountdownMode,
} from "@lootlog/domain/timers";
import { cn } from "cn";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { TimerCountdown } from "@/features/guild/timers/timer-countdown";
import { subscribeToSecondClock } from "@/hooks/utils/second-clock";
import { timestampToDate } from "@/utils/date/parse-timestamp-to-date";

type HeroSightingTimerProps = {
  timer: TimerResponseDto | undefined;
  countdownMode: TimerCountdownMode;
  removeTimerAfterMs: number;
  className?: string;
};

const formatHour = (timestamp: string) => timestampToDate(timestamp, "HH:mm");

/**
 * The sighted hero's respawn timer, counting down as on the timers page, so a
 * detection reads against when the hero can be up.
 */
export const HeroSightingTimer = ({
  timer,
  countdownMode,
  removeTimerAfterMs,
  className,
}: HeroSightingTimerProps) => {
  const { t } = useTranslation();
  const [now, setNow] = useState(Date.now);

  useEffect(() => subscribeToSecondClock(() => setNow(Date.now())), []);

  if (!timer) {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>
        {t("heroSightings.noTimer")}
      </span>
    );
  }

  const timeLeft = getTimerTimeLeft(timer, now);

  return (
    <span className={cn("flex flex-col gap-0.5", className)}>
      <span className="sr-only">{t("heroSightings.respawn")}</span>
      <TimerCountdown
        timeLeft={timeLeft}
        phase={getTimerPhase(timeLeft, removeTimerAfterMs)}
        countdownMode={countdownMode}
      />
      <span className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">
        {t("heroSightings.spawnWindow", {
          from: formatHour(timer.minSpawnTime),
          to: formatHour(timer.maxSpawnTime),
        })}
      </span>
    </span>
  );
};
