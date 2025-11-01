import { useQuery } from "@tanstack/react-query";
import { stringify } from "qs";
import { useAuthenticatedApiClient } from "@/hooks/api/use-api-client";
import type { Npc } from "@/hooks/api/use-npcs";
import { API_URL } from "@/config/api";
import type { GuildMember } from "@/hooks/api/use-guild-members";

export type UseTimersOptions = {
  world?: string;
};

export type Timer = {
  minSpawnTime: Date;
  maxSpawnTime: Date;
  npc: Npc;
  npcId: number;
  member: GuildMember;
  members?: GuildMember[];
  world: string;
  guildId: string;
  isCustomTime?: boolean;
  isPending?: boolean;
  tempId?: string;
  wasReset?: boolean;
  updatedAt?: Date;
};

export const useTimers = ({ world }: UseTimersOptions) => {
  const { client } = useAuthenticatedApiClient();

  const queryParams = {
    world,
  };

  const queryString = stringify(queryParams);

  const query = useQuery({
    queryKey: ["guild-timers", world],
    queryFn: async () => {
      const response = await client.get<Timer[]>(
        `${API_URL}/timers?${queryString}`,
      );
      return response;
    },
    enabled: !!world,
    select: (response) => {
      const cleanedTimers = response.data.map((timer) => ({
        ...timer,
        isPending: false,
      }));
      return cleanedTimers;
    },
    staleTime: 0,
  });

  return query;
};
