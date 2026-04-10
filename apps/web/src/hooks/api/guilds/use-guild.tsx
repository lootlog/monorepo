import { useQuery, queryOptions } from "@tanstack/react-query";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { apiClient, type ApiRequestConfig } from "@/lib/api-client/api-client";
import { queryKeys } from "@/lib/query-keys";

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

type GuildQueryOptionsOptions = {
  suppressRouteErrorToast?: boolean;
};

export const guildQueryOptions = (
  guildId: string,
  { suppressRouteErrorToast = false }: GuildQueryOptionsOptions = {},
) =>
  queryOptions({
    queryKey: queryKeys.guilds.current(guildId),
    queryFn: async () => {
      const response = await apiClient.get<Guild>(`/guilds/${guildId}`, {
        suppressRouteErrorToast,
      } as ApiRequestConfig);
      return response;
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
