import { useQuery } from "@tanstack/react-query";
import { Npc } from "@/hooks/api/use-npcs";
import { GuildMember } from "@/hooks/api/use-guild-member";
import { stringify } from "qs";
import { useGuildContext } from "@/hooks/use-guild-context";
import { useApiClient } from "@/hooks/api/use-api-client";
import { useGuildId } from "@/hooks/use-guild-id";

export type Timer = {
  minSpawnTime: Date;
  maxSpawnTime: Date;
  npc: Npc;
  member: GuildMember;
};

export const useTimers = () => {
  const { client } = useApiClient();
  const { world } = useGuildContext();
  const guildId = useGuildId();

  const queryParams = {
    world,
  };

  const queryString = stringify(queryParams);

  const query = useQuery({
    queryKey: ["guild-timers", world, guildId],
    queryFn: () =>
      client.get<Timer[]>(`/guilds/${guildId}/timers?${queryString}`),
    enabled: !!world,
    select: (response) => response.data,
  });

  return query;
};
