import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { stringify } from "qs";

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
  totalKills: number;
  killsByType: KillsByType;
};

export type MemberKillRanking = {
  memberId: number;
  memberName: string;
  memberAvatar: string | null;
  memberUserId: string;
  totalKills: number;
  killsByType: KillsByType;
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

  const queryString = stringify(queryParams, {
    filter: (_, value) => {
      if (value === "" || value === undefined || value === null) {
        return;
      }
      return value;
    },
  });

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
