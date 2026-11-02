import { useEffect, useEffectEvent, useRef } from "react";
import { normalizeTimerResponse, type Timer } from "@/api/timers.api";
import type { TimerResponseDto } from "@lootlog/client/main";
import { GatewayEvent } from "@/config/gateway";
import { useSocket } from "@/contexts/socket-context";
import { useTimersCache } from "@/hooks/api/use-timers-cache";
import { useQueryClient, type Query } from "@tanstack/react-query";
import { queryKeys } from "@/features/public-api/query-keys";
import { getTimerQueryGuildId } from "@/lib/game-access-cache";

export const useTimersSocket = () => {
  const { socket, connected, joined, joinedGuilds, status } = useSocket();
  const { upsertTimer, removeTimer } = useTimersCache();
  const queryClient = useQueryClient();
  const needsCatchUp = useRef(false);

  // The gateway forwards the API's timer response as is.
  const handleTimerCreate = useEffectEvent((data: TimerResponseDto) => {
    upsertTimer(normalizeTimerResponse(data));
  });

  const handleTimerDelete = useEffectEvent((data: Timer) => {
    removeTimer(data);
  });

  const refreshAfterReconnect = useEffectEvent(() => {
    void queryClient.cancelQueries({ queryKey: queryKeys.allTimers() });
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
  });

  useEffect(() => {
    if (status === "unreachable") needsCatchUp.current = true;

    if (!connected || !joined || !socket) {
      return;
    }

    const onTimerCreate = (data: TimerResponseDto) => {
      handleTimerCreate(data);
    };

    const onTimerDelete = (data: Timer) => {
      handleTimerDelete(data);
    };

    socket.on(GatewayEvent.TIMERS_CREATE, onTimerCreate);
    socket.on(GatewayEvent.TIMERS_DELETE, onTimerDelete);

    if (needsCatchUp.current) refreshAfterReconnect();
    needsCatchUp.current = true;

    return () => {
      socket.off(GatewayEvent.TIMERS_CREATE, onTimerCreate);
      socket.off(GatewayEvent.TIMERS_DELETE, onTimerDelete);
    };
  }, [connected, joined, socket, status]);
};
