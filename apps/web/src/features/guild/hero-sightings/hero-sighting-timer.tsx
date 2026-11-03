import type { TimerResponseDto } from "@lootlog/client/main";
import {
  getTimerPhase,
  getTimerTimeLeft,
  type TimerCountdownMode,
} from "@lootlog/domain/timers";
import { cn } from "cn";
import { isSameDay } from "date-fns";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { RelativeTime } from "@/components/common/relative-time";
import { TimerCountdown } from "@/features/guild/timers/timer-countdown";
import { subscribeToSecondClock } from "@/hooks/utils/second-clock";
import { timestampToDate } from "@/utils/date/parse-timestamp-to-date";

type HeroSightingTimerProps = {
  /** The hero's live timer, as the timers page lists it. */
  timer: TimerResponseDto | undefined;
  /** The hero's latest timer, kept after its window ended. */
  lastTimer: TimerResponseDto | undefined;
  countdownMode: TimerCountdownMode;
  removeTimerAfterMs: number;
  className?: string;
};

// A window on another day names it once, so an old one does not read as
// today's.
const formatWindow = (from: string, to: string, now: number) => {
  const start = timestampToDate(
    from,
    isSameDay(from, now) ? "HH:mm" : "dd.MM HH:mm",
  );

  const end = timestampToDate(
    to,
    isSameDay(from, to) ? "HH:mm" : "dd.MM HH:mm",
  );

  return `${start}–${end}`;
};

/**
 * The sighted hero's respawn timer, counting down as on the timers page. Once
 * its window ended or it was deleted, it says since when the board lost
 * track of the hero.
 */
export const HeroSightingTimer = ({
  timer,
  lastTimer,
  countdownMode,
  removeTimerAfterMs,
  className,
}: HeroSightingTimerProps) => {
  const { t } = useTranslation();
  const [now, setNow] = useState(Date.now);

  useEffect(() => subscribeToSecondClock(() => setNow(Date.now())), []);

  // Until the live list loads, or while it fails, a latest timer that was not
  // deleted still counts down; the phase sends an ended one below.
  const liveTimer = timer ?? (lastTimer?.deletedAt ? undefined : lastTimer);
  const liveTimeLeft = liveTimer && getTimerTimeLeft(liveTimer, now);

  const livePhase =
    liveTimeLeft && getTimerPhase(liveTimeLeft, removeTimerAfterMs);

  if (liveTimer && liveTimeLeft && livePhase && livePhase !== "expired") {
    return (
      <span className={cn("flex flex-col gap-0.5", className)}>
        <span className="sr-only">{t("heroSightings.respawn")}</span>
        <TimerCountdown
          timeLeft={liveTimeLeft}
          phase={livePhase}
          countdownMode={countdownMode}
        />
        <span className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">
          {t("heroSightings.spawnWindow", {
            window: formatWindow(
              liveTimer.minSpawnTime,
              liveTimer.maxSpawnTime,
              now,
            ),
          })}
        </span>
      </span>
    );
  }

  const ended = timer ?? lastTimer;

  if (!ended) {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>
        {t("heroSightings.noTimer")}
      </span>
    );
  }

  const deletedAt = ended.deletedAt ?? null;

  return (
    <span
      className={cn("flex flex-col gap-0.5", className)}
      title={t("heroSightings.lostTrackingDescription")}
    >
      <span className="flex flex-wrap items-baseline gap-x-1 text-sm leading-5 font-medium text-muted-foreground">
        {t(
          deletedAt === null
            ? "heroSightings.timerEnded"
            : "heroSightings.timerDeleted",
        )}
        <RelativeTime
          at={deletedAt ?? ended.maxSpawnTime}
          now={now}
          className="text-sm"
        />
      </span>
      <span className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">
        {t("heroSightings.lastSpawnWindow", {
          window: formatWindow(ended.minSpawnTime, ended.maxSpawnTime, now),
        })}
      </span>
      <span className="sr-only">
        {t("heroSightings.lostTrackingDescription")}
      </span>
    </span>
  );
};
