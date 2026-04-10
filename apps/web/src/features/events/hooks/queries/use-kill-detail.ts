import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
import type { KillParticipant, HeroKillHeroNpc } from "./use-hero-kill-history";
import { queryKeys } from "@/lib/query-keys";
import type {
  EventScoringMode,
  EventScoringRules,
} from "../../types/scoring-rules";

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
  respawnDurationSeconds: number | null;
  windowDurationSeconds: number | null;
  resolvedAfterMaxSpawnTimeMs: number | null;
  heroNpc: KillDetailHeroNpc;
  timerCreatedBy: KillDetailMember | null;
  points: KillDetailParticipant[];
}

export interface EventConfig {
  scoringMode: EventScoringMode;
  scoringRules: EventScoringRules | null;
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
    queryKey: queryKeys.events.killDetail(guildId, eventId, heroId, killId),
    queryFn: async (): Promise<KillDetailResponse> => {
      const response = await client.get<KillDetailResponse>(
        `/guilds/${guildId}/events/${eventId}/heroes/${heroId}/kills/${killId}`,
      );
      return response;
    },
    enabled: !!guildId && !!eventId && !!heroId && !!killId,
  });
};
