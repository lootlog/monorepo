import { useEffect, useEffectEvent, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getTimersControllerGetTimersQueryKey,
  type TimerResponseDto,
} from "@lootlog/client/main";
import { subscribeToSecondClock } from "@/hooks/utils/second-clock";

// A response reflects expiries that preceded its evaluation on the server,
// which can lag its receipt by the request's latency.
const RESPONSE_LATENCY_ALLOWANCE_MS = 60_000;

export function useTimerExpiry(
  timers: Pick<TimerResponseDto, "timerKey" | "maxSpawnTime">[] | undefined,
  guildId: string | undefined,
  world: string | null | undefined,
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
      expired.set(timer.timerKey, timer.maxSpawnTime);

      if (expiredRef.current.get(timer.timerKey) !== timer.maxSpawnTime) {
        hasNewExpiry = true;
      }
    }

    expiredRef.current = expired;

    if (hasNewExpiry && guildId && world) {
      void queryClient.invalidateQueries({
        queryKey: getTimersControllerGetTimersQueryKey({ guildId }, { world }),
        exact: true,
      });
    }
  });

  useEffect(() => {
    expiredRef.current.clear();

    if (!hasTimers || !guildId || !world) return;

    return subscribeToSecondClock(() => tick());
  }, [guildId, world, hasTimers]);
}
