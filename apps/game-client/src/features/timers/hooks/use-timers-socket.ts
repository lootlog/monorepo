import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { AxiosResponse } from "axios";
import type { Timer } from "@/hooks/api/use-timers";
import { GatewayEvent } from "@/config/gateway";
import { useGateway } from "@/hooks/gateway/use-gateway";

export const useTimersSocket = (world: string | undefined) => {
  const { socket, connected, joinedGuilds, joined } = useGateway();
  const queryClient = useQueryClient();
  const [isListenersActive, setIsListenersActive] = useState(false);

  const handleTimerMessage = useCallback(
    (data: Timer) => {
      if (!data.world) return;

      queryClient.setQueryData(
        ["guild-timers", data.world],
        (old?: AxiosResponse<Timer[]>) => {
          const previous = old?.data ?? [];
          const updated = [...previous];

          const index = updated.findIndex(
            (t) =>
              t.npcId === data.npcId &&
              t.guildId === data.guildId &&
              t.world === data.world,
          );

          if (index !== -1) {
            updated[index] = { ...data, isPending: false };
          } else {
            updated.push({ ...data, isPending: false });
          }

          if (old) {
            return { ...old, data: updated };
          }

          return { data: updated } as AxiosResponse<Timer[]>;
        },
      );
    },
    [queryClient],
  );

  const handleTimerRemove = useCallback(
    (data: Timer) => {
      if (!data.world) return;

      queryClient.setQueryData(
        ["guild-timers", data.world],
        (old?: AxiosResponse<Timer[]>) => {
          if (!old) return old;

          const filtered = old.data.filter(
            (t) =>
              !(
                t.npcId === data.npcId &&
                t.world === data.world &&
                t.guildId === data.guildId
              ),
          );

          return { ...old, data: filtered };
        },
      );
    },
    [queryClient],
  );

  useEffect(() => {
    if (!connected || !joined || !socket || !world) {
      setIsListenersActive(false);
      return;
    }

    socket.on(GatewayEvent.TIMERS_CREATE, handleTimerMessage);
    socket.on(GatewayEvent.TIMERS_DELETE, handleTimerRemove);
    setIsListenersActive(true);

    return () => {
      socket.off(GatewayEvent.TIMERS_CREATE, handleTimerMessage);
      socket.off(GatewayEvent.TIMERS_DELETE, handleTimerRemove);
      setIsListenersActive(false);
    };
  }, [connected, joined, socket, world, handleTimerMessage, handleTimerRemove]);

  return {
    isListenersActive:
      connected && isListenersActive && joinedGuilds && joinedGuilds.length > 0,
    joinedGuilds,
  };
};
