import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getTimersControllerGetTimersQueryKey,
  type TimerResponseDto,
} from "@lootlog/client/main";
import { subscribeToSecondClock } from "@/hooks/utils/second-clock";

export function useTimerClock(
  timers: Pick<TimerResponseDto, "timerKey" | "maxSpawnTime">[] | undefined,
  guildId: string | undefined,
  world: string | null | undefined,
) {
  const queryClient = useQueryClient();
  const [now, setNow] = useState(Date.now);
  const expiredRef = useRef(new Map<string, string>());
  const hasTimers = (timers?.length ?? 0) > 0;

  const tick = useEffectEvent(() => {
    const currentTime = Date.now();
    setNow(currentTime);
    const expired = new Map<string, string>();
    let hasNewExpiry = false;
    for (const timer of timers ?? []) {
      if (Date.parse(timer.maxSpawnTime) > currentTime) continue;
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

  return now;
}
