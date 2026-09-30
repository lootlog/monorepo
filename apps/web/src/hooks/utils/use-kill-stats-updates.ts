import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getKillsControllerGetUserKillActivityQueryKey,
  getKillsControllerGetUserKillAnalyticsQueryKey,
  getKillsControllerGetUserKillStatsQueryKey,
  getKillsControllerGetUserNpcKillsQueryKey,
} from "@lootlog/client/main";
import { GatewayEvent } from "@/config/gateway";
import type { GatewayClient } from "@/lib/gateway-client";

const queryKeys = [
  getKillsControllerGetUserKillStatsQueryKey(),
  getKillsControllerGetUserKillActivityQueryKey(),
  getKillsControllerGetUserKillAnalyticsQueryKey(),
  getKillsControllerGetUserNpcKillsQueryKey(),
];

export function useKillStatsUpdates(socket: Pick<GatewayClient, "on" | "off">) {
  const queryClient = useQueryClient();
  // Only one callback-owned timer can be pending; cleanup cancels it and both listeners.
  // eslint-disable-next-line react-doctor/effect-needs-cleanup -- The analyzer does not track the timer assigned inside scheduleRefresh.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const scheduleRefresh = () => {
      if (timer !== undefined) return;
      // Organization events are only refresh hints, never personal increments.
      timer = setTimeout(() => {
        timer = undefined;

        for (const queryKey of queryKeys) {
          void queryClient.invalidateQueries({ queryKey });
        }
      }, 1_000);
    };

    // A join right after the page's initial reads has nothing to recover.
    const onJoin = (payload: { recover: boolean }) => {
      if (payload.recover) scheduleRefresh();
    };

    socket.on(GatewayEvent.KILLS_CHANGED, scheduleRefresh);
    socket.on(GatewayEvent.JOIN, onJoin);

    return () => {
      clearTimeout(timer);
      socket.off(GatewayEvent.KILLS_CHANGED, scheduleRefresh);
      socket.off(GatewayEvent.JOIN, onJoin);
    };
  }, [queryClient, socket]);
}
