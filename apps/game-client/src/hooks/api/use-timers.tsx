import { useQuery } from "@tanstack/react-query";
import { stringify } from "qs";
import { useAuthenticatedApiClient } from "@/hooks/api/use-api-client";
import { GuildMember } from "@/hooks/api/use-guild-members";
import { Npc } from "@/hooks/api/use-npcs";
import { API_URL } from "@/config/api";
import { useGlobalContext } from "@/contexts/global-context";

export type Timer = {
  id: number;
  minSpawnTime: Date;
  maxSpawnTime: Date;
  npc: Npc;
  member: GuildMember;
  world: string;
};

export const useTimers = () => {
  const { client, hasToken } = useAuthenticatedApiClient();
  const { newInterface } = useGlobalContext();

  const world = newInterface
    ? window.Engine?.worldConfig?.getWorldName()
    : window.g?.worldConfig?.getWorldName();

  const queryParams = {
    world,
  };

  const queryString = stringify(queryParams);

  const query = useQuery({
    queryKey: ["guild-timers", world],
    queryFn: () => client.get<Timer[]>(`${API_URL}/timers?${queryString}`),
    enabled: !!hasToken && !!world,
    select: (response) => response.data,
  });

  return query;
};
