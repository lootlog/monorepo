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
  console.log("[USE_TIMERS_SOCKET] Hook called with:", {
    socketId: socket?.id,
    connected,
    desiredWorld,
  });

  const queryClient = useQueryClient();
  const desiredWorldRef = useRef<string | undefined>(desiredWorld);

  useEffect(() => {
    console.log("[USE_TIMERS_SOCKET] Effect: desiredWorld changed", {
      oldWorld: desiredWorldRef.current,
      newWorld: desiredWorld,
    });
    desiredWorldRef.current = desiredWorld;
  }, [desiredWorld]);

  const handleTimerMessage = useCallback(
    (data: Timer) => {
      console.log("[TIMERS] Received timer message:", {
        npcName: data.npc.name,
        npcId: data.npcId,
        guildId: data.guildId,
        world: data.world,
        tempId: data.tempId,
        desiredWorld: desiredWorldRef.current,
        minSpawnTime: data.minSpawnTime,
        maxSpawnTime: data.maxSpawnTime,
      });

      queryClient.setQueryData(
        ["guild-timers", desiredWorldRef.current],
        (old: AxiosResponse<Timer[]>) => {
          console.log("[TIMERS] Current timers count:", old?.data?.length ?? 0);

          if (data.world !== desiredWorldRef.current) {
            console.log("[TIMERS] World mismatch - ignoring update", {
              dataWorld: data.world,
              desiredWorld: desiredWorldRef.current,
            });
            return old;
          }

          const updated = [...(old?.data || [])];

          let timerIndex = -1;

          if (data.tempId) {
            timerIndex = updated.findIndex((t) => t.tempId === data.tempId);
            console.log("[TIMERS] Looking for timer by tempId:", {
              tempId: data.tempId,
              foundIndex: timerIndex,
            });
          }

          if (timerIndex === -1) {
            timerIndex = updated.findIndex(
              (t) =>
                t.npcId === data.npcId &&
                t.guildId === data.guildId &&
                t.world === data.world,
            );
            console.log("[TIMERS] Looking for timer by composite key:", {
              npcId: data.npcId,
              guildId: data.guildId,
              world: data.world,
              foundIndex: timerIndex,
            });
          }

          if (timerIndex !== -1) {
            console.log("[TIMERS] Updating timer at index", timerIndex);
            updated[timerIndex] = { ...data, isPending: false };
          } else {
            console.log("[TIMERS] Adding new timer");
            updated.push({ ...data, isPending: false });
          }

          console.log("[TIMERS] Updated timers count:", updated.length);
          return { data: updated };
        },
      );
    },
    [queryClient],
  );

  const handleTimerRemove = useCallback(
    (data: Timer) => {
      console.log("[TIMERS] Received timer remove:", {
        npcId: data.npcId,
        guildId: data.guildId,
        world: data.world,
        desiredWorld: desiredWorldRef.current,
      });

      queryClient.setQueryData(
        ["guild-timers", desiredWorldRef.current],
        (old: AxiosResponse<Timer[]>) => {
          console.log(
            "[TIMERS] Current timers before remove:",
            old?.data?.length ?? 0,
          );

          if (data.world !== desiredWorldRef.current) {
            console.log("[TIMERS] World mismatch - ignoring remove", {
              dataWorld: data.world,
              desiredWorld: desiredWorldRef.current,
            });
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

          console.log("[TIMERS] Timers after remove:", filtered.length);
          return { data: filtered };
        },
      );
    },
    [queryClient],
  );

  useEffect(() => {
    console.log(
      "[USE_TIMERS_SOCKET] Effect: Socket event registration effect triggered",
      {
        connected,
        socketId: socket?.id,
        handleTimerMessageRef: handleTimerMessage,
        handleTimerRemoveRef: handleTimerRemove,
      },
    );

    if (!connected) {
      console.log(
        "[USE_TIMERS_SOCKET] Socket not connected, skipping event registration",
      );
      return;
    }

    console.log("[USE_TIMERS_SOCKET] Registering socket event listeners", {
      socketId: socket?.id,
      connected,
    });

    socket?.on(GatewayEvent.TIMERS_CREATE, handleTimerMessage);
    socket?.on(GatewayEvent.TIMERS_DELETE, handleTimerRemove);

    return () => {
      console.log(
        "[USE_TIMERS_SOCKET] Cleanup: Unregistering socket event listeners",
        {
          socketId: socket?.id,
        },
      );
      socket?.off(GatewayEvent.TIMERS_CREATE, handleTimerMessage);
      socket?.off(GatewayEvent.TIMERS_DELETE, handleTimerRemove);
    };
  }, [connected, socket, handleTimerMessage, handleTimerRemove]);

  console.log("[USE_TIMERS_SOCKET] Hook complete");
};
