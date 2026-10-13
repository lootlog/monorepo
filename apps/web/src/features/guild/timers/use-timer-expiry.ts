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

/**
 * Refetches the timer lists under `queryKey` once one of their timers has been
 * past its maximum spawn time for the removal delay, when the game client drops
 * it too; the server then keeps only the timers the player pinned.
 */
export function useTimerExpiry(
  timers:
    | Pick<TimerResponseDto, "world" | "timerKey" | "maxSpawnTime">[]
    | undefined,
  queryKey: QueryKey | null,
  fetchedAt: number,
  removeTimerAfterMs: number,
) {
  const queryClient = useQueryClient();
  const expiredRef = useRef(new Map<string, string>());
  const hasTimers = (timers?.length ?? 0) > 0;

  const tick = useEffectEvent(() => {
    const currentTime = Date.now();
    const expired = new Map<string, string>();
    let hasNewExpiry = false;

    for (const timer of timers ?? []) {
      const removedAt = Date.parse(timer.maxSpawnTime) + removeTimerAfterMs;

      if (
        removedAt > currentTime ||
        removedAt <= fetchedAt - RESPONSE_LATENCY_ALLOWANCE_MS
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
      void queryClient.invalidateQueries({ queryKey });
    }
  });

  const queryIdentity = queryKey ? hashKey(queryKey) : null;

  useEffect(() => {
    expiredRef.current.clear();

    if (!hasTimers || !queryIdentity) return;

    return subscribeToSecondClock(() => tick());
  }, [queryIdentity, hasTimers]);
}
