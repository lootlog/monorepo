import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useAuthToken } from "../auth/use-auth-token";
import { Guild } from "@/hooks/api/use-guild";
import { API_URL } from "@/config/api";

export const useGuilds = () => {
  const token = useAuthToken();

  const query = useQuery({
    queryKey: ["user-guilds"],
    queryFn: () =>
      axios.get<Guild[]>(`${API_URL}/users/@me/guilds`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    enabled: !!token,
    select: (response) => response.data,
  });

  return query;
};
