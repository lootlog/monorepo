import { useEffect, useState } from "react";
import { ClockArrowDown, ClockArrowUp } from "lucide-react";
import { cn } from "cn";
import { subscribeToSecondClock } from "@/hooks/utils/second-clock";
import { parseMsToTime } from "@/utils/date/parse-ms-to-time";

export const TimerCountdown = ({
  minSpawnTime,
  maxSpawnTime,
}: {
  minSpawnTime: number;
  maxSpawnTime: number;
}) => {
  const [now, setNow] = useState(Date.now);

  useEffect(() => subscribeToSecondClock(() => setNow(Date.now())), []);

  const timeLeft = Math.max(0, maxSpawnTime - now);
  const minTimeLeft = minSpawnTime - now;
  const isMinSpawnTime = minSpawnTime < maxSpawnTime && minTimeLeft <= 0;

  return (
    <div className="flex shrink-0 flex-col items-end gap-0.5">
      {!isMinSpawnTime && (
        <span className="flex items-center gap-1 text-xs tabular-nums text-muted-foreground">
          <ClockArrowDown size="14px" />
          {parseMsToTime(minTimeLeft)}
        </span>
      )}
      <span
        className={cn(
          "flex items-center gap-1 text-xs font-medium tabular-nums",
          {
            "text-orange-400": isMinSpawnTime,
            "text-red-500": timeLeft < 30_000,
          },
        )}
      >
        <ClockArrowUp size="14px" />
        {parseMsToTime(timeLeft)}
      </span>
    </div>
  );
};
