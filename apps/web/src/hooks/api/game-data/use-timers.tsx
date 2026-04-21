import { queryOptions, useQuery } from "@tanstack/react-query";
import type { Npc } from "@/hooks/api/game-data/use-npcs";
import type { MemberResponseDto as GuildMember } from "@/lib/api/generated/main/model";
import { stringify } from "qs";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useGuildContext } from "@/hooks/context/use-guild-context";
import { apiClient } from "@/lib/api-client/api-client";
import { queryKeys } from "@/lib/query-keys";

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
    queryKey: queryKeys.gameData.guildTimers(world, guildId),
    queryFn: async () => {
      const response = await apiClient.get<Timer[]>(
        `/guilds/${guildId}/timers?${queryString}`,
      );

      return response;
    },
    enabled: !!guildId && !!world && enabled,
    staleTime: 15_000,
  });
};
