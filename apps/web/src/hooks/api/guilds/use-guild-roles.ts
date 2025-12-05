import { useQuery, queryOptions } from "@tanstack/react-query";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { apiClient } from "@/lib/api-client/api-client";
import type { Permission } from "@lootlog/types";

export type GuildRole = {
  id: string;
  guildId: string;
  name: string;
  color: number;
  permissions: Permission[];
  lvlRangeFrom: number;
  lvlRangeTo: number;
};

export const guildRolesQueryOptions = (guildId: string) =>
  queryOptions({
    queryKey: ["guild-roles", guildId],
    queryFn: async () => {
      const response = await apiClient.get<GuildRole[]>(
        `/guilds/${guildId}/roles`,
      );
      return response.data;
    },
    enabled: !!guildId,
  });

export const useGuildRoles = () => {
  const guildId = useGuildId();

  const query = useQuery({
    ...guildRolesQueryOptions(guildId ?? ""),
  });

  return query;
};
