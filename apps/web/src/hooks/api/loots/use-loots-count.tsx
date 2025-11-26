import { useQuery } from "@tanstack/react-query";
import { stringify } from "qs";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useApiClient } from "@/hooks/api/use-api-client";
import { useGuildContext } from "@/hooks/context/use-guild-context";
import { useLootsFilters } from "@/hooks/use-loots-filters";

export type UseLootsCountResponse = {
  count: number;
};

export const useLootsCount = () => {
  const guildId = useGuildId();
  const { client } = useApiClient();
  const { world } = useGuildContext();
  const { filters } = useLootsFilters();

  const queryParams = {
    npcs: filters.npcs.length > 0 ? filters.npcs : undefined,
    npcTypes: filters.npcTypes.length > 0 ? filters.npcTypes : undefined,
    rarities: filters.rarities.length > 0 ? filters.rarities : undefined,
    players: filters.players.length > 0 ? filters.players : undefined,
    npcLevelMin: filters.npcLevelMin || undefined,
    npcLevelMax: filters.npcLevelMax || undefined,
    itemLevelMin: filters.itemLevelMin || undefined,
    itemLevelMax: filters.itemLevelMax || undefined,
    playerLevelMin: filters.playerLevelMin || undefined,
    playerLevelMax: filters.playerLevelMax || undefined,
    search: filters.search || undefined,
    hid: filters.hid || undefined,
    itemNames: filters.itemNames.length > 0 ? filters.itemNames : undefined,
    world,
  };

  const queryString = stringify(queryParams, {
    arrayFormat: "comma",
    allowEmptyArrays: false,
    filter: (_, value) => {
      if (value === "" || value === undefined || value === null) {
        return;
      }

      return value;
    },
  });

  const query = useQuery({
    queryKey: ["loots", "count", guildId, queryString],
    queryFn: () =>
      client.get<UseLootsCountResponse>(
        `/guilds/${guildId}/loots/count?${queryString}`,
      ),
    enabled: !!guildId && !!world,
    refetchOnMount: "always",
    staleTime: 0,
    meta: { persist: false },
  });

  return query;
};
