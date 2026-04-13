import { useQuery } from "@tanstack/react-query";
import { SEARCH_API_URL } from "@/config/api";
import { useApiClient } from "@/hooks/api/use-api-client";
import { queryKeys } from "@/lib/query-keys";

export enum NpcType {
  COMMON = "COMMON",
  ELITE = "ELITE",
  ELITE2 = "ELITE2",
  ELITE3 = "ELITE3",
  HERO = "HERO",
  EVENT_HERO = "EVENT_HERO",
  TITAN = "TITAN",
  COLOSSUS = "COLOSSUS",
  NPC = "NPC",
}

export type Npc = {
  id: number;
  name: string;
  lvl: number;
  prof?: string;
  icon: string;
  wt: number;
  type: NpcType;
  location?: string;
  margonemType: number;
};

export type UseGuildNpcsOptions = {
  search?: string;
  selectedNpcs?: string;
  world?: string;
  enabled?: boolean;
};

export const useNpcs = ({
  search,
  selectedNpcs,
  world,
  enabled = true,
}: UseGuildNpcsOptions) => {
  const { client } = useApiClient();
  const normalizedSearch = search?.trim() ?? "";
  const normalizedSelectedNpcs = selectedNpcs?.trim() ?? "";

  const queryParams = {
    search: normalizedSearch || normalizedSelectedNpcs,
    ...(world ? { world } : {}),
  };

  const query = useQuery({
    queryKey: queryKeys.gameData.guildNpcs(
      normalizedSearch,
      normalizedSelectedNpcs,
      world ?? "",
    ),
    queryFn: () =>
      client.get<Npc[]>(
        `${SEARCH_API_URL}/npcs?${new URLSearchParams(queryParams).toString()}`,
      ),
    enabled:
      enabled &&
      (normalizedSearch.length > 0 || normalizedSelectedNpcs.length > 0),
  });

  return query;
};
