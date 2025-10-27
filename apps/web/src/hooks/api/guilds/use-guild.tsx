import { useQuery, queryOptions } from "@tanstack/react-query";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { apiClient } from "@/lib/api-client/api-client";

export type Guild = {
  id: string;
  name: string;
  icon: string | null;
  vanityUrl?: string;
  ownerId: string;
};

type UseGuildOptions = {
  retry?: boolean;
};

export const guildQueryOptions = (guildId: string) =>
  queryOptions({
    queryKey: ["guilds", guildId],
    queryFn: async () => {
      const response = await apiClient.get<Guild>(`/guilds/${guildId}`);
      return response.data;
    },
    enabled: !!guildId,
  });

export const useGuild = ({ retry = true }: UseGuildOptions = {}) => {
  const guildId = useGuildId();

  const query = useQuery({
    ...guildQueryOptions(guildId ?? ""),
    retry,
  });

  return query;
};
