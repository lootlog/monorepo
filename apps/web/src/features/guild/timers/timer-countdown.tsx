import { useEffect, useState } from "react";
import { ClockArrowDown, ClockArrowUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "cn";
import { subscribeToSecondClock } from "@/hooks/utils/second-clock";
import { parseMsToTime } from "@lootlog/datetime";

/** Under this much time to the maximum respawn, the countdown turns critical. */
const CRITICAL_TIME_LEFT_MS = 30_000;

type TimerPhase = "waiting" | "window" | "critical" | "expired";

const getTimerPhase = (
  minTimeLeft: number,
  timeLeft: number,
  hasSpawnWindow: boolean,
): TimerPhase => {
  if (timeLeft <= 0) return "expired";

  if (timeLeft < CRITICAL_TIME_LEFT_MS) return "critical";

  return hasSpawnWindow && minTimeLeft <= 0 ? "window" : "waiting";
};

// The respawn phases share the signal colors of the event respawn windows.
const MAX_COUNTDOWN_CLASS: Record<Exclude<TimerPhase, "expired">, string> = {
  waiting: "text-foreground",
  window: "text-signal-ready",
  critical: "text-signal-alert",
};

export const TimerCountdown = ({
  minSpawnTime,
  maxSpawnTime,
}: {
  minSpawnTime: number;
  maxSpawnTime: number;
}) => {
  const { t } = useTranslation();
  const [now, setNow] = useState(Date.now);

  useEffect(() => subscribeToSecondClock(() => setNow(Date.now())), []);

  const timeLeft = Math.max(0, maxSpawnTime - now);
  const minTimeLeft = minSpawnTime - now;

  const phase = getTimerPhase(
    minTimeLeft,
    timeLeft,
    minSpawnTime < maxSpawnTime,
  );

  if (phase === "expired") {
    return (
      <span className="shrink-0 text-xs font-medium text-muted-foreground">
        {t("timers.status.expired")}
      </span>
    );
  }

  return (
    <span className="flex shrink-0 flex-col items-end gap-0.5">
      {phase === "waiting" && minSpawnTime < maxSpawnTime && (
        <span className="flex items-center gap-1 text-xs tabular-nums text-signal-timer">
          <ClockArrowDown className="size-3.5" aria-hidden="true" />
          {parseMsToTime(minTimeLeft)}
        </span>
      )}
      <span
        className={cn(
          "flex items-center gap-1 text-xs font-medium tabular-nums",
          MAX_COUNTDOWN_CLASS[phase],
        )}
      >
        <ClockArrowUp className="size-3.5" aria-hidden="true" />
        {parseMsToTime(timeLeft)}
      </span>
    </span>
  );
};
