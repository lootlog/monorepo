import { useQuery } from "@tanstack/react-query";
import { API_URL } from "config/api";
import { useGuildId } from "hooks/use-guild-id";
import { Npc } from "hooks/api/use-npcs";
import { GuildMember } from "hooks/api/use-guild-members";
import { stringify } from "qs";
import { useGuildContext } from "hooks/use-guild-context";
import { useApiClient } from "hooks/api/use-api-client";

export type Timer = {
  minSpawnTime: Date;
  maxSpawnTime: Date;
  npc: Npc;
  member: GuildMember;
};

export const useTimers = () => {
  const { client, isAuthenticated } = useApiClient();
  const guildId = useGuildId();
  const { world } = useGuildContext();

  const queryParams = {
    world,
  };

  const queryString = stringify(queryParams);

  const query = useQuery({
    queryKey: ["guild-timers", guildId, world],
    queryFn: () =>
      client.get<Timer[]>(`${API_URL}/guilds/${guildId}/timers?${queryString}`),
    enabled: isAuthenticated && !!guildId && !!world,
    select: (response) => response.data,
  });

  return query;
};
