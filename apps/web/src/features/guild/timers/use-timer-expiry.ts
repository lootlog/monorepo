import { useEffect, useEffectEvent, useRef } from "react";
import { hashKey, useQueryClient, type QueryKey } from "@tanstack/react-query";
import type { TimerResponseDto } from "@lootlog/client/main";
import { subscribeToSecondClock } from "@/hooks/utils/second-clock";

// A response reflects expiries that preceded its evaluation on the server,
// which can lag its receipt by the request's latency.
const RESPONSE_LATENCY_ALLOWANCE_MS = 60_000;

// One NPC has a timer on every world it spawns on.
const getTimerIdentity = (
  timer: Pick<TimerResponseDto, "world" | "timerKey">,
) => `${timer.world}:${timer.timerKey}`;

/** Refetches the timers list `queryKey` names once one of its timers expires. */
export function useTimerExpiry(
  timers:
    | Pick<TimerResponseDto, "world" | "timerKey" | "maxSpawnTime">[]
    | undefined,
  queryKey: QueryKey | null,
  fetchedAt: number,
) {
  const queryClient = useQueryClient();
  const expiredRef = useRef(new Map<string, string>());
  const hasTimers = (timers?.length ?? 0) > 0;

  const tick = useEffectEvent(() => {
    const currentTime = Date.now();
    const expired = new Map<string, string>();
    let hasNewExpiry = false;

    for (const timer of timers ?? []) {
      const maxSpawnTime = Date.parse(timer.maxSpawnTime);

      if (
        maxSpawnTime > currentTime ||
        maxSpawnTime <= fetchedAt - RESPONSE_LATENCY_ALLOWANCE_MS
      )
        continue;
      const identity = getTimerIdentity(timer);

      expired.set(identity, timer.maxSpawnTime);

      if (expiredRef.current.get(identity) !== timer.maxSpawnTime) {
        hasNewExpiry = true;
      }
    }

    expiredRef.current = expired;

    if (hasNewExpiry && queryKey) {
      void queryClient.invalidateQueries({ queryKey, exact: true });
    }
  });

  const queryIdentity = queryKey ? hashKey(queryKey) : null;

  useEffect(() => {
    expiredRef.current.clear();

    if (!hasTimers || !queryIdentity) return;

    return subscribeToSecondClock(() => tick());
  }, [queryIdentity, hasTimers]);
}
