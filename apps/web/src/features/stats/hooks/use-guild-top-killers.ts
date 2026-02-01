import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
import { useGuildId } from "@/hooks/context/use-guild-id";

export type TopKiller = {
  memberId: number;
  memberName: string;
  memberAvatar: string | null;
  memberUserId: string;
  totalParticipations: number;
};

export type GuildTopKillersResponse = {
  TITAN?: TopKiller[];
  HERO?: TopKiller[];
  EVENT_HERO?: TopKiller[];
};

export const useGuildTopKillers = (limit: number = 5) => {
  const guildId = useGuildId();
  const { client } = useApiClient();

  return useQuery({
    queryKey: ["guild-top-killers", guildId, limit],
    queryFn: async () => {
      const response = await client.get<GuildTopKillersResponse>(
        `/guilds/${guildId}/stats/kills/top-killers?limit=${limit}`,
      );
      return response.data;
    },
    enabled: !!guildId,
    staleTime: 30000,
  });
};
