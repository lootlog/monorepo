import { useEffect, useEffectEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { GatewayEvent } from "@/config/gateway";
import { useGateway } from "@/hooks/utils/use-gateway";
import { invalidateKillQueries } from "../mutations/invalidate-kill-queries";
import {
  invalidateMapQueries,
  invalidateGapQueries,
} from "../mutations/invalidate-map-queries";
import { invalidateRankingQueries } from "../mutations/invalidate-ranking-queries";
import { invalidateRespawnQueries } from "../mutations/invalidate-respawn-queries";

interface UseEventSocketOptions {
  eventId?: string;
  guildId?: string;
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
  const { guildId, eventId } = options ?? {};

  const handleMapStatusUpdate = useEffectEvent(
    (payload: EventMapStatusUpdatePayload) => {
      if (!isMatchingEventPayload(payload, guildId, eventId)) {
        return;
      }

      if (payload.reason === "presence") {
        invalidateGapQueries(
          queryClient,
          payload.guildId,
          payload.eventId,
          payload.mapId,
        );
      } else {
        invalidateMapQueries(
          queryClient,
          payload.guildId,
          payload.eventId,
          payload.mapId,
        );
      }
    },
  );
  const handleHeroKilled = useEffectEvent((payload: EventPayload) => {
    if (!isMatchingEventPayload(payload, guildId, eventId)) {
      return;
    }

    invalidateKillQueries(queryClient, payload.guildId, payload.eventId);
  });
  const handleRankingUpdate = useEffectEvent((payload: EventPayload) => {
    if (!isMatchingEventPayload(payload, guildId, eventId)) {
      return;
    }

    invalidateRankingQueries(queryClient, payload.guildId, payload.eventId);
  });
  const handleRespawnWindowChange = useEffectEvent(
    (payload: EventRespawnWindowPayload) => {
      if (!isMatchingEventPayload(payload, guildId, eventId)) {
        return;
      }

      invalidateRespawnQueries(
        queryClient,
        payload.guildId,
        payload.eventId,
        payload.heroId,
      );
    },
  );

  useEffect(() => {
    if (!guildId || !eventId) {
      return;
    }

    socket.on(GatewayEvent.EVENT_MAP_STATUS_UPDATE, handleMapStatusUpdate);
    socket.on(GatewayEvent.EVENT_HERO_KILLED, handleHeroKilled);
    socket.on(GatewayEvent.EVENT_RANKING_UPDATE, handleRankingUpdate);
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
      socket.off(
        GatewayEvent.EVENT_RESPAWN_WINDOW_OPENED,
        handleRespawnWindowChange,
      );
      socket.off(
        GatewayEvent.EVENT_RESPAWN_WINDOW_CLOSED,
        handleRespawnWindowChange,
      );
    };
  }, [eventId, guildId, socket]);

  return { connected };
};
