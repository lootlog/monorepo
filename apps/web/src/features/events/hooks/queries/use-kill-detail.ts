import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
import type { KillParticipant, HeroKillHeroNpc } from "./use-hero-kill-history";

export interface KillDetailMember {
  id: number;
  name: string;
  avatar: string | null;
  userId: string;
}

export interface KillDetailParticipant extends KillParticipant {
  member: KillDetailMember & {
    roles: Array<{
      position: number | null;
      color: number | null;
    }>;
  };
}

export interface KillDetailHeroNpc extends HeroKillHeroNpc {
  event: {
    id: string;
    name: string;
    world: string;
  };
}

export interface KillDetail {
  id: string;
  heroNpcId: string;
  killedAt: string;
  minSpawnTimeAtKill: string;
  maxSpawnTimeAtKill: string;
  timerCreatedById: number | null;
  isManualClose: boolean;
  windowDurationSeconds: number | null;
  heroNpc: KillDetailHeroNpc;
  timerCreatedBy: KillDetailMember | null;
  points: KillDetailParticipant[];
}

export interface EventConfig {
  autoCalculatePoints: boolean;
  basePointsPerKill: number;
  timeOfDayMultipliers: Array<{
    from: string;
    to: string;
    multiplier: number;
  }> | null;
  trackersMultipliers: Record<string, number> | null;
  mapsCountMultipliers: Record<string, number> | null;
}

export interface KillDetailResponse {
  kill: KillDetail;
  eventConfig: EventConfig;
}

interface UseKillDetailOptions {
  guildId: string;
  eventId: string;
  heroId: string;
  killId: string;
}

export const useKillDetail = ({
  guildId,
  eventId,
  heroId,
  killId,
}: UseKillDetailOptions) => {
  const { client } = useApiClient();

  return useQuery({
    queryKey: ["kill-detail", guildId, eventId, heroId, killId],
    queryFn: async (): Promise<KillDetailResponse> => {
      const response = await client.get<KillDetailResponse>(
        `/guilds/${guildId}/events/${eventId}/heroes/${heroId}/kills/${killId}`,
      );
      return response.data;
    },
    enabled: !!guildId && !!eventId && !!heroId && !!killId,
  });
};
