import { useQuery } from "@tanstack/react-query";
import { searchNpcs, type NpcSearchResult } from "@/api";

export type { NpcSearchResult } from "@/api";

export const useSearchNpcs = (
  guildId: string,
  world: string,
  search: string,
  enabled: boolean = true,
) => {
  return useQuery({
    queryKey: ["search-npcs", guildId, world, search],
    queryFn: () => searchNpcs(guildId, world, search),
    enabled: enabled && search.length >= 2,
    staleTime: 60000,
  });
};
