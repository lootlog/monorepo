import { queryOptions, useQuery } from "@tanstack/react-query";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { apiClient } from "@/lib/api-client/api-client";
import type { Permission } from "@lootlog/types";

export const guildPermissionsQueryOptions = (guildId: string) =>
  queryOptions({
    queryKey: ["guild-permissions", guildId],
    queryFn: async () => {
      const response = await apiClient.get<Permission[]>(
        `/guilds/${guildId}/permissions`,
      );
      return response.data;
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
