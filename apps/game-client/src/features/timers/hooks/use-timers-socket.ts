import { useEffect, useEffectEvent } from "react";
import { normalizeTimerResponse } from "@/api/timers.api";
import type { TimerUpdated } from "@lootlog/protocol/realtime/organization-events";
import type { TimerIdentity } from "@lootlog/domain/timers";
import { useSocket } from "@/contexts/socket-context";
import { useReconnectCatchUp } from "@/hooks/use-reconnect-catch-up";
import { useTimersCache } from "@/features/timers/hooks/use-timers-cache";
import { useQueryClient, type Query } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { getTimerQueryGuildId } from "@/lib/game-access-cache";

export const useTimersSocket = () => {
  const { socket, connected, joined, joinedGuilds } = useSocket();
  const { upsertTimer, removeTimer } = useTimersCache();
  const queryClient = useQueryClient();

  const handleTimerCreate = useEffectEvent((data: TimerUpdated) => {
    upsertTimer(normalizeTimerResponse(data));
  });

  const handleTimerDelete = useEffectEvent((data: TimerIdentity) => {
    removeTimer(data);
  });

  useEffect(() => {
    if (!connected || !joined || !socket) {
      return;
    }

    const onTimerCreate = (data: TimerUpdated) => {
      handleTimerCreate(data);
    };

    const onTimerDelete = (data: TimerIdentity) => {
      handleTimerDelete(data);
    };

    socket.on("timer.created", onTimerCreate);
    socket.on("timer.deleted", onTimerDelete);

    return () => {
      socket.off("timer.created", onTimerCreate);
      socket.off("timer.deleted", onTimerDelete);
    };
  }, [connected, joined, socket]);

  useReconnectCatchUp(() => {
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
};
