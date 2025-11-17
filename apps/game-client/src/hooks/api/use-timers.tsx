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
  wasReset?: boolean;
  updatedAt?: Date;
};

const timersKey = (world?: string) => ["guild-timers", world] as const;

export const useTimers = ({ world }: UseTimersOptions) => {
  const { client } = useAuthenticatedApiClient();

  const queryParams = { world };
  const queryString = stringify(queryParams);

  const query = useQuery({
    queryKey: timersKey(world),
    enabled: !!world,
    staleTime: 0,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<Timer[]> => {
      const { data } = await client.get<Timer[]>(
        `${API_URL}/timers?${queryString}`,
      );

      return data;
    },
  });

  return query;
};
