import type { ActivePartyGatheringUpdate } from "@lootlog/schema/party-ready-room";
import {
  applyActiveGatheringUpdate,
  applyActiveGatheringsSnapshot,
  EMPTY_ACTIVE_GATHERINGS,
  type ActiveGatheringsCache,
} from "../active-party-gatherings-cache";
import { isApiError } from "@lootlog/client/transport";
import { throttle } from "es-toolkit";
import { useEffect, useEffectEvent, useState } from "react";
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

export function useActivePartyGatherings({ visible = true } = {}) {
  const [now, setNow] = useState(Date.now);
  const [recoveryInterval] = useState(() => 60_000 + Math.random() * 6_000);
  const accountId = useGameStore((state) => state.game?.hero.accountId);
  const characterId = useGameStore((state) => state.game?.hero.characterId);
  const world = useGameStore((state) => state.game?.world ?? "");
  const { socket, connected, joined } = useSocket();
  const { data: session } = useSession();
  const { visibleGuilds, areVisibleGuildsResolved } = useLootlogGuilds();
  const queryClient = useQueryClient();

  const queryKey = [
    ...ACTIVE_GATHERINGS_QUERY_KEY,
    session?.user?.id,
    accountId,
    characterId,
    world,
  ];

  const readable = [
    joined,
    session?.user.id,
    world,
    areVisibleGuildsResolved,
  ].every(Boolean);

  const query = useQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      const baseline =
        queryClient.getQueryData<ActiveGatheringsCache>(queryKey) ??
        EMPTY_ACTIVE_GATHERINGS;

      if (baseline.snapshotAppliedAt !== null)
        queryClient.setQueryData<ActiveGatheringsCache>(queryKey, {
          ...baseline,
          snapshotAppliedAt: null,
        });

      const rooms = await partyReadyRoomControllerActive({ world }, { signal });

      return applyActiveGatheringsSnapshot(
        queryClient.getQueryData<ActiveGatheringsCache>(queryKey) ??
          EMPTY_ACTIVE_GATHERINGS,
        rooms,
        baseline,
      );
    },
    enabled: readable && connected && visible,
    staleTime: 0,
  });

  const recoverSnapshot = useEffectEvent(() => {
    void query.refetch({ cancelRefetch: false });
  });

  useEffect(() => {
    if (!readable || !connected || !visible) return;
    // A fixed cadence cannot be postponed by frequent deltas updating the cache.
    const timer = window.setInterval(recoverSnapshot, recoveryInterval);

    return () => window.clearInterval(timer);
  }, [readable, connected, visible, recoveryInterval]);

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

    const updateActive = (update: ActivePartyGatheringUpdate) => {
      if (update.type === "UPSERT" && update.summary.world !== world) return;
      queryClient.setQueryData<ActiveGatheringsCache>(
        [
          ...ACTIVE_GATHERINGS_QUERY_KEY,
          session?.user?.id,
          accountId,
          characterId,
          world,
        ],
        (cache) =>
          applyActiveGatheringUpdate(cache ?? EMPTY_ACTIVE_GATHERINGS, update),
      );
    };

    socket.on(GatewayEvent.ACTIVE_PARTY_GATHERING_UPDATE, updateActive);

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

    // Older gateways lack summaries; retain reconciliation until their rollout completes.
    const legacy = !socket.supportsActivePartyGatherings();

    if (legacy) socket.on(GatewayEvent.NOTIFICATION, newGathering);

    if (legacy) socket.on(GatewayEvent.CHAT_MESSAGE, newGathering);

    if (legacy) for (const event of events) socket.on(event, reconcile);
    socket.on(GatewayEvent.PERMISSIONS_UPDATED, permissionsChanged);

    return () => {
      reconcile.cancel();
      socket.off(GatewayEvent.ACTIVE_PARTY_GATHERING_UPDATE, updateActive);
      socket.off(GatewayEvent.NOTIFICATION, newGathering);
      socket.off(GatewayEvent.CHAT_MESSAGE, newGathering);

      for (const event of events) socket.off(event, reconcile);
      socket.off(GatewayEvent.PERMISSIONS_UPDATED, permissionsChanged);
    };
  }, [
    connected,
    joined,
    socket,
    queryClient,
    session?.user?.id,
    accountId,
    characterId,
    world,
  ]);
  useEffect(() => {
    const nextExpiry = Math.min(
      ...(query.data?.rooms ?? []).flatMap((room) => {
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
    isStale: query.isError || !connected || !query.data?.snapshotAppliedAt,
    data:
      readable && !accessDenied
        ? (query.data?.rooms ?? [])
            .filter(
              (room) =>
                room.world === world &&
                Date.parse(room.expiresAt) > observedAt &&
                room.guildIds.some((id) => enabledIds.has(id)),
            )
            .map((room) => ({ ...room, guildIds: [...room.guildIds] }))
        : [],
  };
}
