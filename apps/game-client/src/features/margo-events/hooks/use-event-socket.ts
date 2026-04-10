import { useEffect } from "react";
import { useSocket } from "@/contexts/socket-context";

interface EventRanking {
  id: string;
  memberId: number;
  totalPoints: number;
  totalKills: number;
  member: {
    id: number;
    name: string;
  };
}

interface PresenceUpdatePayload {
  guildId: string;
  eventId: string;
  mapId: string;
  presenceLog: {
    id: string;
    memberId: number;
    isAfk: boolean;
    member: {
      id: number;
      name: string;
    };
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
  eventId: string;
  guildId: string;
  onPresenceUpdate?: (payload: PresenceUpdatePayload) => void;
  onMapStatusUpdate?: (payload: MapStatusUpdatePayload) => void;
  onHeroKilled?: (payload: HeroKilledPayload) => void;
  onRankingUpdate?: (payload: RankingUpdatePayload) => void;
}

export const useEventSocket = ({
  eventId,
  guildId,
  onPresenceUpdate,
  onMapStatusUpdate,
  onHeroKilled,
  onRankingUpdate,
}: UseEventSocketOptions) => {
  const { socket, connected } = useSocket();

  const handlePresenceUpdate = (payload: PresenceUpdatePayload) => {
    if (payload.guildId === guildId && payload.eventId === eventId) {
      onPresenceUpdate?.(payload);
    }
  };

  const handleMapStatusUpdate = (payload: MapStatusUpdatePayload) => {
    if (payload.guildId === guildId && payload.eventId === eventId) {
      onMapStatusUpdate?.(payload);
    }
  };

  const handleHeroKilled = (payload: HeroKilledPayload) => {
    if (payload.guildId === guildId && payload.eventId === eventId) {
      onHeroKilled?.(payload);
    }
  };

  const handleRankingUpdate = (payload: RankingUpdatePayload) => {
    if (payload.guildId === guildId && payload.eventId === eventId) {
      onRankingUpdate?.(payload);
    }
  };

  useEffect(() => {
    if (!socket || !connected) return;

    // Use string literals since these are new events not in ServerToClientEvents yet
    socket.on("event:presence:update" as any, handlePresenceUpdate);
    socket.on("event:map-status:update" as any, handleMapStatusUpdate);
    socket.on("event:hero:killed" as any, handleHeroKilled);
    socket.on("event:ranking:update" as any, handleRankingUpdate);

    return () => {
      socket.off("event:presence:update" as any, handlePresenceUpdate);
      socket.off("event:map-status:update" as any, handleMapStatusUpdate);
      socket.off("event:hero:killed" as any, handleHeroKilled);
      socket.off("event:ranking:update" as any, handleRankingUpdate);
    };
  }, [
    socket,
    connected,
    handlePresenceUpdate,
    handleMapStatusUpdate,
    handleHeroKilled,
    handleRankingUpdate,
  ]);

  return {
    connected,
  };
};

export type {
  PresenceUpdatePayload,
  MapStatusUpdatePayload,
  HeroKilledPayload,
  RankingUpdatePayload,
};
