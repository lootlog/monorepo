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
    if (!socket) {
      return;
    }

    // Invalidation alone would reuse an in-flight fetch of a list without
    // data, even one sent before the join, so the fetch is cancelled first.
    const refreshTimers = () => {
      void queryClient
        .cancelQueries({ queryKey: queryKeys.allTimers() })
        .then(() =>
          queryClient.invalidateQueries({ queryKey: queryKeys.allTimers() }),
        );
    };

    // Listeners stay attached from mount so none of a session's events can
    // arrive before them; events outside a joined session are ignored.
    const onTimerCreate = (data: Timer) => {
      if (socket.sessionJoined) handleTimerCreate(data);
    };

    const onTimerDelete = (data: Timer) => {
      if (socket.sessionJoined) handleTimerDelete(data);
    };

    socket.on(GatewayEvent.TIMERS_CREATE, onTimerCreate);
    socket.on(GatewayEvent.TIMERS_DELETE, onTimerDelete);
    // Refetching inside the join event cancels a snapshot fetch that still
    // waits for the session, before it sends any request.
    socket.on(GatewayEvent.JOIN, refreshTimers);

    // Events were not applied while unmounted.
    if (socket.sessionJoined) refreshTimers();

    return () => {
      socket.off(GatewayEvent.TIMERS_CREATE, onTimerCreate);
      socket.off(GatewayEvent.TIMERS_DELETE, onTimerDelete);
      socket.off(GatewayEvent.JOIN, refreshTimers);
    };
  }, [socket, queryClient]);

  useEffect(() => {
    if (!connected || !joined || !socket) {
      return;
    }

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
  }, [connected, joined, joinedGuilds, socket, queryClient]);
};
