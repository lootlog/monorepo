import { useQuery } from "@tanstack/react-query";
import { stringify } from "qs";
import { useAuthenticatedApiClient } from "@/hooks/api/use-api-client";
import { GuildMember } from "@/hooks/api/use-guild-members";
import { Npc } from "@/hooks/api/use-npcs";
import { API_URL } from "@/config/api";

export type UseTimersOptions = {
  world?: string;
};

export type Timer = {
  id: number;
  minSpawnTime: Date;
  maxSpawnTime: Date;
  npc: Npc;
  npcId: number;
  member: GuildMember;
  members?: GuildMember[];
  world: string;
  guildId: string;
};

export const useTimers = ({ world }: UseTimersOptions) => {
  const { client } = useAuthenticatedApiClient();

  const queryParams = {
    world,
  };

  const queryString = stringify(queryParams);

  const query = useQuery({
    queryKey: ["guild-timers", world],
    queryFn: () => client.get<Timer[]>(`${API_URL}/timers?${queryString}`),
    enabled: !!world,
    select: (response) => response.data,
  });

  return query;
};
