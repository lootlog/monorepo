import { useEffect, useState } from "react";
import {
  getTimerRemovalAt,
  type TimerSpawnTimes,
} from "@lootlog/domain/timers";

const MAX_TIMEOUT_MS = 2 ** 31 - 1;

const getExpiryCandidates = (
  timer: TimerSpawnTimes,
  removeTimerAfterMs: number,
) => [
  getTimerRemovalAt(timer, removeTimerAfterMs),
  ...(timer.entranceClosesAt ? [Date.parse(timer.entranceClosesAt)] : []),
];

export const useTimerExpiryClock = (
  timers: readonly TimerSpawnTimes[] | undefined,
  removeTimerAfterMs: number,
) => {
  const [now, setNow] = useState(Date.now);

  const nextExpiryAt = Math.min(
    ...(timers ?? [])
      .flatMap((timer) => getExpiryCandidates(timer, removeTimerAfterMs))
      .filter((at) => at > now),
  );

  useEffect(() => {
    if (!Number.isFinite(nextExpiryAt)) return;

    const timeout = setTimeout(
      () => setNow(Date.now()),
      Math.min(nextExpiryAt - Date.now(), MAX_TIMEOUT_MS),
    );

    return () => clearTimeout(timeout);
  }, [nextExpiryAt, now]);

  return now;
};
