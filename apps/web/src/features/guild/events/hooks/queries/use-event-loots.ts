import { useQuery } from "@tanstack/react-query";
import { lootsControllerFetchLootsByGuildId } from "@/lib/api/generated/main/loots/loots";
import type { LootsControllerFetchLootsByGuildIdParams } from "@/lib/api/generated/main/model";
import type { Loot } from "@/lib/loots/loot-types";
import { queryKeys } from "@/lib/query-keys";

interface UseEventLootsOptions {
  guildId: string;
  npcNames: string[];
  world: string;
  limit?: number;
}

export const useEventLoots = ({
  guildId,
  npcNames,
  world,
  limit = 10,
}: UseEventLootsOptions) => {
  const params = {
    limit,
    npcs: npcNames,
    world,
  } satisfies LootsControllerFetchLootsByGuildIdParams;

  return useQuery<Loot[]>({
    queryKey: queryKeys.events.loots(guildId, npcNames.join(","), world, limit),
    queryFn: () =>
      lootsControllerFetchLootsByGuildId({ guildId }, params) as Promise<
        Loot[]
      >,
    enabled: !!guildId && !!world && npcNames.length > 0,
    refetchOnMount: "always",
    staleTime: 0,
  });
};
