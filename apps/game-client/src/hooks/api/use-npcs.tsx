import { useQuery } from "@tanstack/react-query";
import { fetchNpcs, NpcType, type Npc } from "@/api";
import { useAuthToken } from "../auth/use-auth-token";

export { NpcType };
export type { Npc } from "@/api";

type UseGuildNpcsOptions = {
  search?: string;
};

const useNpcs = ({ search }: UseGuildNpcsOptions) => {
  const { data: token } = useAuthToken();
  const guildId = undefined; // TODO: Add proper guild context

  const query = useQuery({
    queryKey: ["guild-npcs", guildId, search],
    queryFn: () => fetchNpcs(token as string, search),
    enabled: !!token && !!guildId,
  });

  return query;
};
