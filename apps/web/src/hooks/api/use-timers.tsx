import { useQuery } from "@tanstack/react-query";
import { API_URL } from "config/api";
import { Npc } from "hooks/api/use-npcs";
import { GuildMember } from "hooks/api/use-guild-members";
import { stringify } from "qs";
import { useGuildContext } from "hooks/use-guild-context";
import { useApiClient } from "hooks/api/use-api-client";
import { useGuildId } from "hooks/use-guild-id";

export type Timer = {
  minSpawnTime: Date;
  maxSpawnTime: Date;
  npc: Npc;
  member: GuildMember;
};

export const useTimers = () => {
  const { client, isAuthenticated } = useApiClient();
  const { world } = useGuildContext();
  const guildId = useGuildId();

  const queryParams = {
    world,
  };

  const queryString = stringify(queryParams);

  const query = useQuery({
    queryKey: ["guild-timers", world, guildId],
    queryFn: () =>
      client.get<Timer[]>(`${API_URL}/guilds/${guildId}/timers?${queryString}`),
    enabled: isAuthenticated && !!world,
    select: (response) => response.data,
  });

  return query;
};
