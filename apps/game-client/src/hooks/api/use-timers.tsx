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
};

type UseTimersOptions = {
  guildId?: string;
};

export const useTimers = ({ guildId }: UseTimersOptions) => {
  const { client, hasToken } = useAuthenticatedApiClient();
  const { newInterface } = useGlobalContext();

  const world = newInterface ? window.Engine?.worldConfig?.getWorldName() : window.g?.worldConfig?.getWorldName();

  const queryParams = {
    world,
  };

  const queryString = stringify(queryParams);

  const query = useQuery({
    queryKey: ["guild-timers", guildId, world],
    queryFn: () =>
      client.get<Timer[]>(`${API_URL}/guilds/${guildId}/timers?${queryString}`),
    enabled: !!hasToken && !!guildId && !!world,
    select: (response) => response.data,
  });

  return query;
};
