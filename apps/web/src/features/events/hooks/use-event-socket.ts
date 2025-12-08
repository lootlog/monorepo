import { useEffect, useCallback } from "react";
import { useGateway } from "@/hooks/utils/use-gateway";
import { GatewayEvent } from "@/config/gateway";
import { useQueryClient } from "@tanstack/react-query";
import { EventRanking } from "@/features/events/hooks/use-events";

interface PresenceUpdatePayload {
  guildId: string;
  eventId: string;
  mapId: string;
  presenceLog: {
    id: string;
    memberId: number;
    isAfk: boolean;
  };
}

interface MapStatusUpdatePayload {
  guildId: string;
  eventId: string;
  mapId: string;
}

interface HeroKilledPayload {
  guildId: string;
  eventId: string;
  heroNpcId: string;
  kill: {
    id: string;
    killedAt: string;
  };
}

interface RankingUpdatePayload {
  guildId: string;
  eventId: string;
  rankings: EventRanking[];
}

interface UseEventSocketOptions {
  eventId?: string;
  guildId?: string;
}

export const useEventSocket = ({ eventId, guildId }: UseEventSocketOptions) => {
  const { socket, connected } = useGateway();
  const queryClient = useQueryClient();

  const handlePresenceUpdate = useCallback(
    (payload: PresenceUpdatePayload) => {
      if (payload.guildId === guildId && payload.eventId === eventId) {
        queryClient.invalidateQueries({
          queryKey: ["event", guildId, eventId],
        });
      }
    },
    [eventId, guildId, queryClient],
  );

  const handleMapStatusUpdate = useCallback(
    (payload: MapStatusUpdatePayload) => {
      if (payload.guildId === guildId && payload.eventId === eventId) {
        queryClient.invalidateQueries({
          queryKey: ["event", guildId, eventId],
        });
      }
    },
    [eventId, guildId, queryClient],
  );

  const handleHeroKilled = useCallback(
    (payload: HeroKilledPayload) => {
      if (payload.guildId === guildId && payload.eventId === eventId) {
        queryClient.invalidateQueries({
          queryKey: ["event", guildId, eventId],
        });
      }
    },
    [eventId, guildId, queryClient],
  );

  const handleRankingUpdate = useCallback(
    (payload: RankingUpdatePayload) => {
      if (payload.guildId === guildId && payload.eventId === eventId) {
        queryClient.invalidateQueries({
          queryKey: ["event", guildId, eventId],
        });
      }
    },
    [eventId, guildId, queryClient],
  );

  useEffect(() => {
    if (!socket || !connected || !eventId || !guildId) return;

    socket.on(GatewayEvent.EVENT_PRESENCE_UPDATE, handlePresenceUpdate);
    socket.on(GatewayEvent.EVENT_MAP_STATUS_UPDATE, handleMapStatusUpdate);
    socket.on(GatewayEvent.EVENT_HERO_KILLED, handleHeroKilled);
    socket.on(GatewayEvent.EVENT_RANKING_UPDATE, handleRankingUpdate);

    return () => {
      socket.off(GatewayEvent.EVENT_PRESENCE_UPDATE, handlePresenceUpdate);
      socket.off(GatewayEvent.EVENT_MAP_STATUS_UPDATE, handleMapStatusUpdate);
      socket.off(GatewayEvent.EVENT_HERO_KILLED, handleHeroKilled);
      socket.off(GatewayEvent.EVENT_RANKING_UPDATE, handleRankingUpdate);
    };
  }, [
    socket,
    connected,
    eventId,
    guildId,
    handlePresenceUpdate,
    handleMapStatusUpdate,
    handleHeroKilled,
    handleRankingUpdate,
  ]);

  return { connected };
};
