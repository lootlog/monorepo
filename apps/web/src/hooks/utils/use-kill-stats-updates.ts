import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getKillsControllerGetUserKillActivityQueryKey,
  getKillsControllerGetUserKillAnalyticsQueryKey,
  getKillsControllerGetUserKillStatsQueryKey,
  getKillsControllerGetUserNpcKillsQueryKey,
} from "@lootlog/client/main";
import type { GatewayClient } from "@/lib/gateway-client";

const queryKeys = [
  getKillsControllerGetUserKillStatsQueryKey(),
  getKillsControllerGetUserKillActivityQueryKey(),
  getKillsControllerGetUserKillAnalyticsQueryKey(),
  getKillsControllerGetUserNpcKillsQueryKey(),
];

export function useKillStatsUpdates(socket: Pick<GatewayClient, "on" | "off">) {
  const queryClient = useQueryClient();
  // oxlint-disable-next-line react-doctor/effect-needs-cleanup -- The analyzer does not track the timer assigned inside scheduleRefresh.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const scheduleRefresh = () => {
      if (timer !== undefined) return;
      timer = setTimeout(() => {
        timer = undefined;

        for (const queryKey of queryKeys) {
          void queryClient.invalidateQueries({ queryKey });
        }
      }, 1_000);
    };

    const onJoin = (payload: { recover: boolean }) => {
      if (payload.recover) scheduleRefresh();
    };

    socket.on("kill-stats.changed", scheduleRefresh);
    socket.on("join", onJoin);

    return () => {
      clearTimeout(timer);
      socket.off("kill-stats.changed", scheduleRefresh);
      socket.off("join", onJoin);
    };
  }, [queryClient, socket]);
}
