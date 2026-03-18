import { useQuery } from "@tanstack/react-query";
import { NpcTypeEnum as NpcType } from "@lootlog/types";
import axios from "axios";
import { useAuthToken } from "../auth/use-auth-token";
import { API_URL } from "@/config/api";

export { NpcType };

export type Npc = {
  id: number;
  name: string;
  lvl: number;
  prof: string;
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
  const token = useAuthToken();
  const guildId = undefined; // TODO: Add proper guild context

  const queryParams = {
    search: search ?? "",
  };

  const query = useQuery({
    queryKey: ["guild-npcs", guildId, search],
    queryFn: () =>
      axios.get<Npc[]>(
        `${API_URL}/npcs?${new URLSearchParams(queryParams).toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      ),
    enabled: !!token && !!guildId,
    select: (response) => response.data,
  });

  return query;
};
