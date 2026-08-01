import { useEffect, useEffectEvent } from "react";
import type { Timer } from "@/api/timers.api";
import { GatewayEvent } from "@/config/gateway";
import { useSocket } from "@/contexts/socket-context";
import { useTimersCache } from "@/hooks/api/use-timers-cache";
import { measureLootlogCallback } from "@/lib/performance-monitoring/measured-callback";

export const useTimersSocket = () => {
  const { socket, connected, joined } = useSocket();
  const { upsertTimer, removeTimer } = useTimersCache();

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

    const onTimerCreate = measureLootlogCallback(
      "socket.timers-create",
      (data: Timer) => {
        handleTimerCreate(data);
      },
    );

    const onTimerDelete = measureLootlogCallback(
      "socket.timers-delete",
      (data: Timer) => {
        handleTimerDelete(data);
      },
    );

    socket.on(GatewayEvent.TIMERS_CREATE, onTimerCreate);
    socket.on(GatewayEvent.TIMERS_DELETE, onTimerDelete);

    return () => {
      socket.off(GatewayEvent.TIMERS_CREATE, onTimerCreate);
      socket.off(GatewayEvent.TIMERS_DELETE, onTimerDelete);
    };
  }, [connected, joined, socket]);
};
