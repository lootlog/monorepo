import { useEffect, useEffectEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGateway } from "@/hooks/utils/use-gateway";
import { invalidateKillQueries } from "../mutations/invalidate-kill-queries";
import {
  invalidateMapQueries,
  invalidateGapQueries,
} from "../mutations/invalidate-map-queries";
import { invalidateRespawnQueries } from "../mutations/invalidate-respawn-queries";

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

    invalidateKillQueries(queryClient, routeGuildId, payload.eventId);
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

  useEffect(() => {
    if (!guildId || !routeGuildId || !eventId) {
      return;
    }

    socket.on("event.map-status-updated", handleMapStatusUpdate);
    socket.on("event.hero-killed", handleHeroKilled);
    socket.on("event.ranking-updated", handleRankingUpdate);
    socket.on("event.respawn-window-opened", handleRespawnWindowChange);
    socket.on("event.respawn-window-closed", handleRespawnWindowChange);

    return () => {
      socket.off("event.map-status-updated", handleMapStatusUpdate);
      socket.off("event.hero-killed", handleHeroKilled);
      socket.off("event.ranking-updated", handleRankingUpdate);
      socket.off("event.respawn-window-opened", handleRespawnWindowChange);
      socket.off("event.respawn-window-closed", handleRespawnWindowChange);
    };
  }, [eventId, guildId, routeGuildId, socket]);

  return { connected };
};
