import { useEffect, useEffectEvent, useRef } from "react";
import { normalizeTimerResponse } from "@/api/timers.api";
import type { TimerResponseDto } from "@lootlog/client/main";
import type { TimerIdentity } from "@lootlog/domain/timers";
import { useSocket } from "@/contexts/socket-context";
import { useTimersCache } from "@/features/timers/hooks/use-timers-cache";
import { useQueryClient, type Query } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
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

  const handleTimerDelete = useEffectEvent((data: TimerIdentity) => {
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

    const onTimerDelete = (data: TimerIdentity) => {
      handleTimerDelete(data);
    };

    socket.on("timer.created", onTimerCreate);
    socket.on("timer.deleted", onTimerDelete);

    if (needsCatchUp.current) refreshAfterReconnect();
    needsCatchUp.current = true;

    return () => {
      socket.off("timer.created", onTimerCreate);
      socket.off("timer.deleted", onTimerDelete);
    };
  }, [connected, joined, socket, status]);
};
