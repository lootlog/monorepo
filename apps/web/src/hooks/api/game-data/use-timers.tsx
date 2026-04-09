import { queryOptions, useQuery } from "@tanstack/react-query";
import type { Npc } from "@/hooks/api/game-data/use-npcs";
import type { GuildMember } from "@/hooks/api/members/use-guild-member";
import { stringify } from "qs";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useGuildContext } from "@/hooks/context/use-guild-context";
import { apiClient } from "@/lib/api-client/api-client";

export type Timer = {
  minSpawnTime: Date;
  maxSpawnTime: Date;
  npc: Npc;
  member: GuildMember;
};

export const useTimers = (enabled = true) => {
  const { world } = useGuildContext();
  const guildId = useGuildId();

  return useQuery(
    timersQueryOptions({ guildId: guildId ?? "", world, enabled }),
  );
};

export const timersQueryOptions = ({
  guildId,
  world,
  enabled = true,
}: {
  guildId: string;
  world?: string;
  enabled?: boolean;
}) => {
  const queryString = stringify({ world });

  return queryOptions({
    queryKey: ["guild-timers", world, guildId],
    queryFn: async () => {
      const response = await apiClient.get<Timer[]>(
        `/guilds/${guildId}/timers?${queryString}`,
      );

      return response.data;
    },
    enabled: !!guildId && !!world && enabled,
    staleTime: 15_000,
    meta: { persist: false },
  });
};
