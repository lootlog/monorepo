import { useEffect, useEffectEvent, useRef } from "react";
import { hashKey, useQueryClient, type QueryKey } from "@tanstack/react-query";
import type { TimerResponseDto } from "@lootlog/client/main";
import { getTimerIdentityKey, getTimerRemovalAt } from "@lootlog/domain/timers";
import { subscribeToSecondClock } from "@/hooks/utils/second-clock";

const RESPONSE_LATENCY_ALLOWANCE_MS = 60_000;

export function useTimerExpiry(
  timers:
    | Pick<
        TimerResponseDto,
        "guildId" | "world" | "timerKey" | "maxSpawnTime" | "deletedAt"
      >[]
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
      const removedAt = getTimerRemovalAt(timer, removeTimerAfterMs);

      if (
        removedAt > currentTime ||
        removedAt <= fetchedAt - RESPONSE_LATENCY_ALLOWANCE_MS
      )
        continue;
      const identity = getTimerIdentityKey(timer);

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
