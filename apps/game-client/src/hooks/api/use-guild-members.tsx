import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useAuthToken } from "../auth/use-auth-token";
import { API_URL } from "@/config/api";
import { User } from "@/hooks/api/use-user";

export type GuildMember = {
  id: string;
  guildId: string;
  type: string;
  name: string;
  user: User;
};

export const useGuildMembers = (guildId?: string) => {
  const token = useAuthToken();

  const query = useQuery({
    queryKey: ["guild-members", guildId],
    queryFn: () =>
      axios.get<GuildMember[]>(`${API_URL}/guilds/${guildId}/members`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    enabled: !!token && !!guildId,
    select: (response) => response.data,
  });

  return query;
};
