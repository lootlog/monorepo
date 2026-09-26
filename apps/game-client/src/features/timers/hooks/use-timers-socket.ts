import { useEffect, useEffectEvent } from "react";
import type { Timer } from "@/api/timers.api";
import { GatewayEvent } from "@/config/gateway";
import { useSocket } from "@/contexts/socket-context";
import { useTimersCache } from "@/hooks/api/use-timers-cache";
import { useQueryClient, type Query } from "@tanstack/react-query";
import { queryKeys } from "@/features/public-api/query-keys";
import { getTimerQueryGuildId } from "@/lib/game-access-cache";

export const useTimersSocket = () => {
  const { socket, connected, joined, joinedGuilds } = useSocket();
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

    const histories = {
      predicate: (query: Query) => {
        const guildId = getTimerQueryGuildId(query);

        return (
          guildId !== undefined &&
          guildId !== null &&
          joinedGuilds.includes(guildId)
        );
      },
    };

    void queryClient.cancelQueries(histories);
    void queryClient.invalidateQueries({ ...histories, refetchType: "active" });

    return () => {
      socket.off(GatewayEvent.TIMERS_CREATE, onTimerCreate);
      socket.off(GatewayEvent.TIMERS_DELETE, onTimerDelete);
    };
  }, [connected, joined, joinedGuilds, socket, queryClient]);
};
