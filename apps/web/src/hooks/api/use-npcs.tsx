import { useQuery } from "@tanstack/react-query";
import { API_URL } from "config/api";
import { useApiClient } from "hooks/api/use-api-client";
import { useGuildId } from "hooks/use-guild-id";

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
};

export const useNpcs = ({ search }: UseGuildNpcsOptions) => {
  const guildId = useGuildId();
  const { client, isAuthenticated } = useApiClient();

  const queryParams = {
    search: search ?? "",
  };

  const query = useQuery({
    queryKey: ["guild-npcs", guildId, search],
    queryFn: () =>
      client.get<Npc[]>(
        `${API_URL}/npcs?${new URLSearchParams(queryParams).toString()}`
      ),
    enabled: isAuthenticated && !!guildId,
    select: (response) => response.data,
  });

  return query;
};
