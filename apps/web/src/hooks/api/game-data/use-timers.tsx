import { useQuery } from "@tanstack/react-query";
import type { Npc } from "@/hooks/api/game-data/use-npcs";
import type { GuildMember } from "@/hooks/api/members/use-guild-member";
import { stringify } from "qs";
import { useApiClient } from "@/hooks/api/use-api-client";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useGuildContext } from "@/hooks/context/use-guild-context";

export type Timer = {
  minSpawnTime: Date;
  maxSpawnTime: Date;
  npc: Npc;
  member: GuildMember;
};

export const useTimers = (enabled = true) => {
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
    enabled: !!world && enabled,
    select: (response) => response.data,
    refetchOnMount: "always",
  });

  return query;
};
