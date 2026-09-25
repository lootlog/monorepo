import { isApiError } from "@lootlog/client/transport";
import { throttle } from "es-toolkit";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { partyReadyRoomControllerActive } from "@lootlog/client/main";
import { useSocket } from "@/contexts/socket-context";
import { GatewayEvent } from "@/config/gateway";
import { useGameStore } from "@/store/game.store";
import { useLootlogGuilds } from "@/hooks/use-lootlog-guilds";
import { useSession } from "@/hooks/auth/use-session";

export const ACTIVE_GATHERINGS_QUERY_KEY = ["active-party-gatherings"];

// Chat edits and participant updates arrive in bursts. Coalesce them into at
// most one refetch per window instead of cancelling and restarting the request
// for each; the trailing edge fires after the last update, so none is missed.
const RECONCILE_THROTTLE_MS = 500;

export function useActivePartyGatherings() {
  const [now, setNow] = useState(Date.now);
  const world = useGameStore((state) => state.game?.world ?? "");
  const { socket, connected, joined } = useSocket();
  const { data: session } = useSession();
  const { visibleGuilds, areVisibleGuildsResolved } = useLootlogGuilds();
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
    staleTime: 0,
  });

  // oxlint-disable-next-line react-doctor/effect-needs-cleanup -- Cleanup removes every listener with the same event and handler, including the events loop.
  useEffect(() => {
    if (!connected || !joined || !socket) return;

    const invalidate = () => {
      void queryClient.invalidateQueries({
        queryKey: ACTIVE_GATHERINGS_QUERY_KEY,
      });
    };

    const reconcile = throttle(invalidate, RECONCILE_THROTTLE_MS, {
      edges: ["trailing"],
    });

    const permissionsChanged = () => {
      reconcile.cancel();
      void queryClient.resetQueries({ queryKey: ACTIVE_GATHERINGS_QUERY_KEY });
    };

    invalidate();

    const events = [
      GatewayEvent.CHAT_MESSAGE_UPDATE,
      GatewayEvent.CHAT_MESSAGE_DELETE,
      GatewayEvent.PARTY_READY_ROOM_UPDATE,
      GatewayEvent.PARTY_GATHERING_SEND,
      GatewayEvent.PARTY_GATHERING_CANCEL,
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
      reconcile.cancel();
      socket.off(GatewayEvent.NOTIFICATION, newGathering);
      socket.off(GatewayEvent.CHAT_MESSAGE, newGathering);

      for (const event of events) socket.off(event, reconcile);
      socket.off(GatewayEvent.PERMISSIONS_UPDATED, permissionsChanged);
    };
  }, [connected, joined, socket, queryClient]);
  useEffect(() => {
    const nextExpiry = Math.min(
      ...(query.data ?? []).flatMap((room) => {
        const expiry = Date.parse(room.expiresAt);

        return expiry > Date.now() ? [expiry] : [];
      }),
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
  const observedAt = Math.max(now, query.dataUpdatedAt, query.errorUpdatedAt);

  return {
    ...query,
    userId: session?.user.id,
    observedAt,
    world,
    visibleGuilds,
    isStale: query.isError || !connected,
    data:
      joined && areVisibleGuildsResolved && !accessDenied
        ? (query.data ?? []).filter(
            (room) =>
              room.world === world &&
              Date.parse(room.expiresAt) > observedAt &&
              room.guildIds.some((id) => enabledIds.has(id)),
          )
        : [],
  };
}
