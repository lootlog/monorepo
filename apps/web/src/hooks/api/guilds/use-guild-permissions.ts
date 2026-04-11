import { queryOptions, useQuery } from "@tanstack/react-query";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { apiClient } from "@/lib/api-client/api-client";
import type { Permission } from "@lootlog/types";
import { queryKeys } from "@/lib/query-keys";

export const guildPermissionsQueryOptions = (guildId: string) =>
  queryOptions({
    queryKey: queryKeys.guilds.permissions(guildId),
    queryFn: async () => {
      const response = await apiClient.get<Permission[]>(
        `/guilds/${guildId}/permissions`,
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
