import { useEffect, useEffectEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { GatewayEvent } from "@/config/gateway";
import { useGateway } from "@/hooks/utils/use-gateway";
import { invalidateKillQueries } from "../mutations/invalidate-kill-queries";
import {
  invalidateEventMapListQuery,
  invalidateMapQueries,
  invalidateGapQueries,
} from "../mutations/invalidate-map-queries";
import { invalidateRankingQueries } from "../mutations/invalidate-ranking-queries";
import { invalidateRespawnQueries } from "../mutations/invalidate-respawn-queries";
import { invalidateEventQueries } from "../mutations/invalidate-event-queries";

interface UseEventSocketOptions {
  eventId?: string;
  guildId?: string;
  routeGuildId?: string;
}

type EventPayload = {
  eventId: string;
  guildId: string;
};

type EventMapStatusUpdatePayload = EventPayload & {
  mapId: string;
  reason?: string;
};

type EventRespawnWindowPayload = EventPayload & {
  heroId: string;
};

const isMatchingEventPayload = (
  payload: EventPayload,
  guildId?: string,
  eventId?: string,
) => {
  return payload.guildId === guildId && payload.eventId === eventId;
};

export const useEventSocket = (options?: UseEventSocketOptions) => {
  const queryClient = useQueryClient();
  const { connected, socket } = useGateway();
  const { guildId, routeGuildId, eventId } = options ?? {};

  const handleMapStatusUpdate = useEffectEvent(
    (payload: EventMapStatusUpdatePayload) => {
      if (!routeGuildId || !isMatchingEventPayload(payload, guildId, eventId)) {
        return;
      }

      if (payload.reason === "presence") {
        invalidateGapQueries(
          queryClient,
          routeGuildId,
          payload.eventId,
          payload.mapId,
        );
      } else {
        invalidateMapQueries(
          queryClient,
          routeGuildId,
          payload.eventId,
          payload.mapId,
        );
      }
    },
  );

  const handleHeroKilled = useEffectEvent((payload: EventPayload) => {
    if (!routeGuildId || !isMatchingEventPayload(payload, guildId, eventId)) {
      return;
    }

    invalidateKillQueries(queryClient, routeGuildId, payload.eventId);
  });

  const handleRankingUpdate = useEffectEvent((payload: EventPayload) => {
    if (!routeGuildId || !isMatchingEventPayload(payload, guildId, eventId)) {
      return;
    }

    invalidateRankingQueries(queryClient, routeGuildId, payload.eventId);
  });

  const handleRespawnWindowChange = useEffectEvent(
    (payload: EventRespawnWindowPayload) => {
      if (!routeGuildId || !isMatchingEventPayload(payload, guildId, eventId)) {
        return;
      }

      invalidateRespawnQueries(
        queryClient,
        routeGuildId,
        payload.eventId,
        payload.heroId,
      );
    },
  );

  const handlePermissionsUpdated = useEffectEvent(() => {
    if (!routeGuildId || !eventId) {
      return;
    }

    invalidateEventMapListQuery(queryClient, routeGuildId, eventId);
  });

  const handleJoin = useEffectEvent(
    (payload: { status: "success" | "error" }) => {
      if (payload.status !== "success" || !routeGuildId || !eventId) {
        return;
      }

      invalidateEventQueries(queryClient, routeGuildId, eventId);
    },
  );

  useEffect(() => {
    if (!guildId || !routeGuildId || !eventId) {
      return;
    }

    socket.on(GatewayEvent.EVENT_MAP_STATUS_UPDATE, handleMapStatusUpdate);
    socket.on(GatewayEvent.EVENT_HERO_KILLED, handleHeroKilled);
    socket.on(GatewayEvent.EVENT_RANKING_UPDATE, handleRankingUpdate);
    socket.on(GatewayEvent.PERMISSIONS_UPDATED, handlePermissionsUpdated);
    socket.on(GatewayEvent.JOIN, handleJoin);
    socket.on(
      GatewayEvent.EVENT_RESPAWN_WINDOW_OPENED,
      handleRespawnWindowChange,
    );
    socket.on(
      GatewayEvent.EVENT_RESPAWN_WINDOW_CLOSED,
      handleRespawnWindowChange,
    );

    return () => {
      socket.off(GatewayEvent.EVENT_MAP_STATUS_UPDATE, handleMapStatusUpdate);
      socket.off(GatewayEvent.EVENT_HERO_KILLED, handleHeroKilled);
      socket.off(GatewayEvent.EVENT_RANKING_UPDATE, handleRankingUpdate);
      socket.off(GatewayEvent.PERMISSIONS_UPDATED, handlePermissionsUpdated);
      socket.off(GatewayEvent.JOIN, handleJoin);
      socket.off(
        GatewayEvent.EVENT_RESPAWN_WINDOW_OPENED,
        handleRespawnWindowChange,
      );
      socket.off(
        GatewayEvent.EVENT_RESPAWN_WINDOW_CLOSED,
        handleRespawnWindowChange,
      );
    };
  }, [eventId, guildId, routeGuildId, socket]);

  return { connected };
};
