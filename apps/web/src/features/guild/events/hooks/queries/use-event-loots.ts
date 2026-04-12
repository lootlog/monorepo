import { useQuery } from "@tanstack/react-query";
import { lootsControllerFetchLootsByGuildId } from "@/lib/api/generated/main/loots/loots";
import type { LootsControllerFetchLootsByGuildIdParams } from "@/lib/api/generated/main/model";
import type { Loot } from "@/hooks/api/loots/use-loots";
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
    cursor: undefined,
    npcs: npcNames,
    players: undefined,
    rarities: undefined,
    npcTypes: undefined,
    world,
    npcLevelMin: undefined,
    npcLevelMax: undefined,
    itemLevelMin: undefined,
    itemLevelMax: undefined,
    playerLevelMin: undefined,
    playerLevelMax: undefined,
    search: undefined,
    hid: undefined,
    itemNames: undefined,
    createdAtMin: undefined,
    createdAtMax: undefined,
  } as unknown as LootsControllerFetchLootsByGuildIdParams;

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
