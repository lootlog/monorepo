import { queryOptions, useQuery } from "@tanstack/react-query";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { apiClient, type ApiRequestConfig } from "@/lib/api-client/api-client";
import type { Permission } from "@lootlog/types";
import { queryKeys } from "@/lib/query-keys";

type GuildPermissionsQueryOptionsOptions = {
  suppressRouteErrorToast?: boolean;
};

export const guildPermissionsQueryOptions = (
  guildId: string,
  { suppressRouteErrorToast = false }: GuildPermissionsQueryOptionsOptions = {},
) =>
  queryOptions({
    queryKey: queryKeys.guilds.permissions(guildId),
    queryFn: async () => {
      const response = await apiClient.get<Permission[]>(
        `/guilds/${guildId}/permissions`,
        {
          suppressRouteErrorToast,
        } as ApiRequestConfig,
      );
      return response;
    },
    staleTime: 30_000,
  });

export const useGuildPermissions = () => {
  const guildId = useGuildId();

  const query = useQuery({
    ...guildPermissionsQueryOptions(guildId ?? ""),
  });

  return query;
};
