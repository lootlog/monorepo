import { Schema } from "effect";
import {
  type PartyGatheringClientUpdate,
  PartyGatheringSummarySchema,
} from "@lootlog/schema/party-ready-room";
import {
  applyGatheringUpdate,
  reconcileGatherings,
  type ActivePartyGatheringsCache,
} from "@/features/chat/active-party-gatherings-cache";
import { isApiError } from "@lootlog/client/transport";
import { throttle } from "es-toolkit";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { partyReadyRoomControllerActive } from "@lootlog/client/main";
import { useSocket } from "@/contexts/socket-context";
import { GatewayEvent } from "@/config/gateway";
import type { PermissionsUpdatedPayload } from "@/lib/socket";
import { useGameStore } from "@/store/game.store";
import { useLootlogGuilds } from "@/hooks/use-lootlog-guilds";
import { useSession } from "@/hooks/auth/use-session";

export const ACTIVE_GATHERINGS_QUERY_KEY = ["active-party-gatherings"];

// Chat edits and participant updates arrive in bursts. Coalesce them into at
// most one refetch per window instead of cancelling and restarting the request
// for each; the trailing edge fires after the last update, so none is missed.
const RECONCILE_THROTTLE_MS = 500;

const decodeGatherings = Schema.decodeUnknownSync(
  Schema.Array(PartyGatheringSummarySchema),
);

// Discovery follows chat read access, the organizer's send permission, and
// administration; changes to other areas cannot alter the visible gatherings.
const GATHERING_ACCESS_AREAS = new Set([
  "chat",
  "notifications",
  "organization",
]);

export function useActivePartyGatherings() {
  const [now, setNow] = useState(Date.now);
  const world = useGameStore((state) => state.game?.world ?? "");
  const { socket, connected, joined } = useSocket();
  const { data: session } = useSession();
  const { visibleGuilds, areVisibleGuildsResolved } = useLootlogGuilds();
  const queryClient = useQueryClient();

  const userId = session?.user?.id;
  const queryKey = [...ACTIVE_GATHERINGS_QUERY_KEY, userId, world];

  const query = useQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      const baseline =
        queryClient.getQueryData<ActivePartyGatheringsCache>(queryKey) ?? {};

      const snapshot = decodeGatherings(
        await partyReadyRoomControllerActive({ world }, { signal }),
      );

      const current =
        queryClient.getQueryData<ActivePartyGatheringsCache>(queryKey) ?? {};

      return reconcileGatherings(current, snapshot, baseline);
    },
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

    const permissionsChanged = ({ changes }: PermissionsUpdatedPayload) => {
      const relevant = changes?.filter((change) =>
        change.areas.some((area) => GATHERING_ACCESS_AREAS.has(area)),
      );

      if (relevant?.length === 0) return;
      reconcile.cancel();

      // Revoked access must hide rooms at once; a grant keeps the current bar
      // visible while discovery adds the newly readable rooms.
      if (relevant?.every((change) => !change.restricted)) invalidate();
      else
        void queryClient.resetQueries({
          queryKey: ACTIVE_GATHERINGS_QUERY_KEY,
        });
    };

    const events = [
      GatewayEvent.CHAT_MESSAGE_UPDATE,
      GatewayEvent.CHAT_MESSAGE_DELETE,
      GatewayEvent.PARTY_GATHERING_SEND,
      GatewayEvent.PARTY_GATHERING_CANCEL,
    ];

    // Gateways with live gathering state push every committed change, so only
    // older gateways need the legacy signals to trigger discovery reads.
    const legacyReconcile = () => {
      if (!socket.supportsGatheringState) reconcile();
    };

    const newGathering = (payload: {
      type?: string;
      isGatheringParty?: boolean;
    }) => {
      if (
        payload.type === "PARTY_GATHERING" ||
        payload.isGatheringParty === true
      )
        legacyReconcile();
    };

    const gatheringUpdated = (update: PartyGatheringClientUpdate) => {
      if (update.type === "UPSERT" && update.gathering.world !== world) return;
      queryClient.setQueryData<ActivePartyGatheringsCache>(
        [...ACTIVE_GATHERINGS_QUERY_KEY, userId, world],
        (cache) => applyGatheringUpdate(cache ?? {}, update),
      );
    };

    socket.on(GatewayEvent.PARTY_GATHERING_STATE_UPDATE, gatheringUpdated);
    socket.on(GatewayEvent.PARTY_READY_ROOM_UPDATE, legacyReconcile);
    socket.on(GatewayEvent.NOTIFICATION, newGathering);
    socket.on(GatewayEvent.CHAT_MESSAGE, newGathering);

    for (const event of events) socket.on(event, legacyReconcile);
    socket.on(GatewayEvent.PERMISSIONS_UPDATED, permissionsChanged);

    return () => {
      reconcile.cancel();
      socket.off(GatewayEvent.PARTY_GATHERING_STATE_UPDATE, gatheringUpdated);
      socket.off(GatewayEvent.PARTY_READY_ROOM_UPDATE, legacyReconcile);
      socket.off(GatewayEvent.NOTIFICATION, newGathering);
      socket.off(GatewayEvent.CHAT_MESSAGE, newGathering);

      for (const event of events) socket.off(event, legacyReconcile);
      socket.off(GatewayEvent.PERMISSIONS_UPDATED, permissionsChanged);
    };
  }, [connected, joined, socket, queryClient, userId, world]);
  useEffect(() => {
    const nextExpiry = Math.min(
      ...Object.values(query.data ?? {}).flatMap(({ gathering }) => {
        if (!gathering) return [];
        const expiry = Date.parse(gathering.expiresAt);

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
        ? Object.values(query.data ?? {})
            .flatMap(({ gathering }) => (gathering ? [gathering] : []))
            .filter(
              (room) =>
                room.world === world &&
                Date.parse(room.expiresAt) > observedAt &&
                room.guildIds.some((id) => enabledIds.has(id)),
            )
            .sort((left, right) =>
              right.createdAt.localeCompare(left.createdAt),
            )
        : [],
  };
}
