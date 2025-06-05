import { useQuery } from "@tanstack/react-query";
import { API_URL } from "@/config/api";
import { useAuthenticatedApiClient } from "@/hooks/api/use-api-client";

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
  const { client, hasToken } = useAuthenticatedApiClient();

  const query = useQuery({
    queryKey: ["guilds", guildId],
    queryFn: () => client.get<Guild>(`${API_URL}/guilds/${guildId}`),
    enabled: !!guildId && hasToken,
    select: (response) => response.data,
    retry,
  });

  return query;
};
