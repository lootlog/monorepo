import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { AxiosResponse } from "axios";
import type { Socket } from "socket.io-client";
import type { Timer } from "@/hooks/api/use-timers";
import { GatewayEvent } from "@/config/gateway";

export const useTimersSocket = (
  socket: Socket | null,
  connected: boolean | undefined,
  desiredWorld: string | undefined,
) => {
  const queryClient = useQueryClient();
  const desiredWorldRef = useRef<string | undefined>(desiredWorld);

  useEffect(() => {
    desiredWorldRef.current = desiredWorld;
  }, [desiredWorld]);

  const handleTimerMessage = useCallback(
    (data: Timer) => {
      queryClient.setQueryData(
        ["guild-timers", desiredWorldRef.current],
        (old: AxiosResponse<Timer[]>) => {
          if (data.world !== desiredWorldRef.current) {
            return old;
          }

          const updated = [...(old?.data || [])];

          let timerIndex = -1;

          if (timerIndex === -1) {
            timerIndex = updated.findIndex(
              (t) =>
                t.npcId === data.npcId &&
                t.guildId === data.guildId &&
                t.world === data.world,
            );
          }

          if (timerIndex !== -1) {
            updated[timerIndex] = { ...data, isPending: false };
          } else {
            updated.push({ ...data, isPending: false });
          }
          return { data: updated };
        },
      );
    },
    [queryClient],
  );

  const handleTimerRemove = useCallback(
    (data: Timer) => {
      queryClient.setQueryData(
        ["guild-timers", desiredWorldRef.current],
        (old: AxiosResponse<Timer[]>) => {
          if (data.world !== desiredWorldRef.current) {
            return old;
          }

          const filtered =
            old?.data.filter(
              (t) =>
                !(
                  t.npcId === data.npcId &&
                  t.world === data.world &&
                  t.guildId === data.guildId
                ),
            ) || [];

          return { data: filtered };
        },
      );
    },
    [queryClient],
  );

  useEffect(() => {
    if (!connected) {
      return;
    }

    socket?.on(GatewayEvent.TIMERS_CREATE, handleTimerMessage);
    socket?.on(GatewayEvent.TIMERS_DELETE, handleTimerRemove);

    return () => {
      socket?.off(GatewayEvent.TIMERS_CREATE, handleTimerMessage);
      socket?.off(GatewayEvent.TIMERS_DELETE, handleTimerRemove);
    };
  }, [connected, socket, handleTimerMessage, handleTimerRemove]);
};
