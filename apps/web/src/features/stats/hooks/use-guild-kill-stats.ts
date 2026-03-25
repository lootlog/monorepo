import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { stringifyQueryParams } from "@/lib/stringify-query-params";

export type NpcType =
  | "COMMON"
  | "ELITE"
  | "ELITE2"
  | "ELITE3"
  | "HERO"
  | "EVENT_HERO"
  | "TITAN"
  | "COLOSSUS"
  | "NPC";

export type KillsByType = Partial<Record<NpcType, number>>;

export type KillStatsOverview = {
  guildUniqueKills: number;
  totalMemberParticipations: number;
  killsByType: KillsByType;
  participationsByType: KillsByType;
};

export type MemberKillRanking = {
  memberId: number;
  memberName: string;
  memberAvatar: string | null;
  memberUserId: string;
  totalParticipations: number;
  participationsByType: KillsByType;
};

export type GuildKillStatsResponse = {
  overview: KillStatsOverview;
  memberRanking: MemberKillRanking[];
};

export type GuildKillStatsFilters = {
  npcTypes?: NpcType[];
  minLvl?: number;
  maxLvl?: number;
  world?: string;
};

export const useGuildKillStats = (filters: GuildKillStatsFilters = {}) => {
  const guildId = useGuildId();
  const { client } = useApiClient();

  const queryParams = {
    npcType: filters.npcTypes?.join(",") || undefined,
    minLvl: filters.minLvl || undefined,
    maxLvl: filters.maxLvl || undefined,
    world: filters.world || undefined,
  };

  const queryString = stringifyQueryParams(queryParams);

  return useQuery({
    queryKey: ["guild-kill-stats", guildId, queryString],
    queryFn: async () => {
      const response = await client.get<GuildKillStatsResponse>(
        `/guilds/${guildId}/stats/kills${queryString ? `?${queryString}` : ""}`,
      );
      return response.data;
    },
    enabled: !!guildId,
    staleTime: 30000,
  });
};
