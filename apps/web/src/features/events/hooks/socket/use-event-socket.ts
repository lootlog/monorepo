import { useEffect, useCallback } from "react";
import { useGateway } from "@/hooks/utils/use-gateway";
import { GatewayEvent } from "@/config/gateway";
import { useQueryClient } from "@tanstack/react-query";

interface MapStatusUpdatePayload {
  guildId: string;
  eventId: string;
  mapId: string;
}

interface HeroKilledPayload {
  guildId: string;
  eventId: string;
  killId: string;
}

interface RankingUpdatePayload {
  guildId: string;
  eventId: string;
}

interface RespawnWindowPayload {
  guildId: string;
  eventId: string;
  heroId: string;
}

interface UseEventSocketOptions {
  eventId?: string;
  guildId?: string;
  heroId?: string;
}

export const useEventSocket = ({
  eventId,
  guildId,
  heroId,
}: UseEventSocketOptions) => {
  const { socket, connected } = useGateway();
  const queryClient = useQueryClient();

  const handleMapStatusUpdate = useCallback(
    (payload: MapStatusUpdatePayload) => {
      if (payload.guildId === guildId && payload.eventId === eventId) {
        queryClient.invalidateQueries({
          queryKey: ["event-maps", guildId, eventId],
        });
        queryClient.invalidateQueries({
          queryKey: ["map-active-gap", guildId, eventId, payload.mapId],
        });
      }
    },
    [eventId, guildId, queryClient],
  );

  const handleHeroKilled = useCallback(
    (payload: HeroKilledPayload) => {
      if (payload.guildId === guildId && payload.eventId === eventId) {
        queryClient.invalidateQueries({
          queryKey: ["event-overview", guildId, eventId],
        });
        queryClient.invalidateQueries({
          queryKey: ["event-kill-history", guildId, eventId],
        });
        queryClient.invalidateQueries({
          queryKey: ["hero-kill-history", guildId, eventId],
        });
        queryClient.invalidateQueries({
          queryKey: ["recent-hero-kills", guildId, eventId],
        });
        queryClient.invalidateQueries({
          queryKey: ["event-hero-stats", guildId, eventId],
        });
      }
    },
    [eventId, guildId, queryClient],
  );

  const handleRankingUpdate = useCallback(
    (payload: RankingUpdatePayload) => {
      if (payload.guildId === guildId && payload.eventId === eventId) {
        queryClient.invalidateQueries({
          queryKey: ["event-ranking", guildId, eventId],
        });
      }
    },
    [eventId, guildId, queryClient],
  );

  const handleRespawnWindowChange = useCallback(
    (payload: RespawnWindowPayload) => {
      if (payload.guildId === guildId && payload.eventId === eventId) {
        if (!heroId || payload.heroId === heroId) {
          queryClient.invalidateQueries({
            queryKey: ["hero-respawn-config", guildId, eventId, payload.heroId],
          });
          queryClient.invalidateQueries({
            queryKey: ["event-hero-timers", guildId, eventId],
          });
          queryClient.invalidateQueries({
            queryKey: ["event-maps", guildId, eventId],
          });
        }
      }
    },
    [eventId, guildId, heroId, queryClient],
  );

  useEffect(() => {
    if (!socket || !connected || !eventId || !guildId) return;

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
  }, [
    socket,
    connected,
    eventId,
    guildId,
    handleMapStatusUpdate,
    handleHeroKilled,
    handleRankingUpdate,
    handleRespawnWindowChange,
  ]);

  return { connected };
};
