import { isApiError } from "@lootlog/client/transport";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { partyReadyRoomControllerActive } from "@lootlog/client/main";
import { useSocket } from "@/contexts/socket-context";
import { GatewayEvent } from "@/config/gateway";
import { useGameStore } from "@/store/game.store";
import { useVisibleLootlogGuilds } from "@/hooks/use-visible-lootlog-guilds";
import { useSession } from "@/hooks/auth/use-session";

export const ACTIVE_GATHERINGS_QUERY_KEY = ["active-party-gatherings"];
export function useActivePartyGatherings() {
  const [now, setNow] = useState(Date.now);
  const world = useGameStore((state) => state.game?.world ?? "");
  const { socket, connected, joined } = useSocket();
  const { data: session } = useSession();
  const { visibleGuilds, areVisibleGuildsResolved } = useVisibleLootlogGuilds();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: [...ACTIVE_GATHERINGS_QUERY_KEY, session?.user?.id, world],
    queryFn: ({ signal }) =>
      partyReadyRoomControllerActive({ world }, { signal }),
    enabled:
      joined &&
      connected &&
      !!session?.user.id &&
      !!world &&
      areVisibleGuildsResolved,
    refetchInterval: 30_000,
    staleTime: 0,
  });
  useEffect(() => {
    if (!connected || !joined || !socket) return;
    const reconcile = () => {
      void queryClient.invalidateQueries({
        queryKey: ACTIVE_GATHERINGS_QUERY_KEY,
      });
    };
    const permissionsChanged = () => {
      void queryClient.resetQueries({ queryKey: ACTIVE_GATHERINGS_QUERY_KEY });
    };
    reconcile();
    const events = [
      GatewayEvent.CHAT_MESSAGE_UPDATE,
      GatewayEvent.CHAT_MESSAGE_DELETE,
      GatewayEvent.PARTY_READY_ROOM_UPDATE,
    ];
    const newGathering = (payload: {
      type?: string;
      isGatheringParty?: boolean;
    }) => {
      if (
        payload.type === "PARTY_GATHERING" ||
        payload.isGatheringParty === true
      )
        reconcile();
    };
    socket.on(GatewayEvent.NOTIFICATION, newGathering);
    socket.on(GatewayEvent.CHAT_MESSAGE, newGathering);
    for (const event of events) socket.on(event, reconcile);
    socket.on(GatewayEvent.PERMISSIONS_UPDATED, permissionsChanged);
    return () => {
      socket.off(GatewayEvent.NOTIFICATION, newGathering);
      socket.off(GatewayEvent.CHAT_MESSAGE, newGathering);
      for (const event of events) socket.off(event, reconcile);
      socket.off(GatewayEvent.PERMISSIONS_UPDATED, permissionsChanged);
    };
  }, [connected, joined, socket, queryClient]);
  useEffect(() => {
    const nextExpiry = Math.min(
      ...(query.data ?? [])
        .map((room) => Date.parse(room.expiresAt))
        .filter((expiry) => expiry > Date.now()),
    );
    if (!Number.isFinite(nextExpiry)) return;
    const timer = window.setTimeout(
      () => setNow(Date.now()),
      Math.max(0, nextExpiry - Date.now()),
    );
    return () => window.clearTimeout(timer);
  }, [query.data, now]);
  const accessDenied =
    isApiError(query.error) &&
    (query.error.status === 401 || query.error.status === 403);
  const enabledIds = new Set(visibleGuilds.map((guild) => guild.id));
  return {
    ...query,
    world,
    visibleGuilds,
    isStale: query.isError || !connected,
    data:
      joined && areVisibleGuildsResolved && !accessDenied
        ? (query.data ?? []).filter(
            (room) =>
              room.world === world &&
              Date.parse(room.expiresAt) >
                Math.max(now, query.dataUpdatedAt, query.errorUpdatedAt) &&
              room.guildIds.some((id) => enabledIds.has(id)),
          )
        : [],
  };
}
