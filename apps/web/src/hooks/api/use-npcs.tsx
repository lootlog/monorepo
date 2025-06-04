import { useQuery } from "@tanstack/react-query";
import { SEARCH_API_URL } from "config/api";
import { useApiClient } from "hooks/api/use-api-client";

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
};

export const useNpcs = ({ search, selectedNpcs }: UseGuildNpcsOptions) => {
  const { client, isAuthenticated } = useApiClient();

  const queryParams = {
    search: search || selectedNpcs || "",
  };

  const query = useQuery({
    queryKey: ["guild-npcs", search],
    queryFn: () =>
      client.get<Npc[]>(
        `${SEARCH_API_URL}/npcs?${new URLSearchParams(queryParams).toString()}`
      ),
    enabled: isAuthenticated,
    select: (response) => response.data,
  });

  return query;
};
