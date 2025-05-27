import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useAuthToken } from "../auth/use-auth-token";
import { API_URL } from "@/config/api";

export type Guild = {
  id: string;
  name: string;
  icon: string | null;
  vanityUrl?: string;
};

type UseGuildOptions = {
  guildId?: string;
  retry?: boolean;
};

export const useGuild = ({ guildId, retry = true }: UseGuildOptions) => {
  const token = useAuthToken();

  const query = useQuery({
    queryKey: ["guilds", guildId],
    queryFn: () =>
      axios.get<Guild>(`${API_URL}/guilds/${guildId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    enabled: !!token && !!guildId,
    select: (response) => response.data,
    retry,
  });

  return query;
};
