import { useEffect, useEffectEvent } from "react";
import type { Timer } from "@/api/timers.api";
import { GatewayEvent } from "@/config/gateway";
import { useSocket } from "@/contexts/socket-context";
import { useTimersCache } from "@/hooks/api/use-timers-cache";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/features/public-api/query-keys";

export const useTimersSocket = () => {
  const { socket, connected, joined } = useSocket();
  const { upsertTimer, removeTimer } = useTimersCache();
  const queryClient = useQueryClient();

  const handleTimerCreate = useEffectEvent((data: Timer) => {
    upsertTimer(data);
  });

  const handleTimerDelete = useEffectEvent((data: Timer) => {
    removeTimer(data);
  });

  useEffect(() => {
    if (!connected || !joined || !socket) {
      return;
    }

    const onTimerCreate = (data: Timer) => {
      handleTimerCreate(data);
    };

    const onTimerDelete = (data: Timer) => {
      handleTimerDelete(data);
    };

    socket.on(GatewayEvent.TIMERS_CREATE, onTimerCreate);
    socket.on(GatewayEvent.TIMERS_DELETE, onTimerDelete);
    void queryClient.invalidateQueries({ queryKey: queryKeys.allTimers() });

    return () => {
      socket.off(GatewayEvent.TIMERS_CREATE, onTimerCreate);
      socket.off(GatewayEvent.TIMERS_DELETE, onTimerDelete);
    };
  }, [connected, joined, socket, queryClient]);
};
