import { apiClient, type ApiRequestConfig } from "@/lib/api-client/api-client";
import type { GuildMember } from "@/hooks/api/members/use-guild-member";
import { queryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

type GuildMembersQueryOptionsOptions = {
  includeInactive?: boolean;
};

export const guildMembersQueryOptions = (
  guildId: string,
  { includeInactive = false }: GuildMembersQueryOptionsOptions = {},
) =>
  queryOptions({
    queryKey: queryKeys.members.list(guildId, includeInactive),
    queryFn: async () => {
      const response = await apiClient.get<GuildMember[]>(
        `/guilds/${guildId}/members`,
        {
          params: { includeInactive: includeInactive.toString() },
        } as ApiRequestConfig,
      );

      return response;
    },
    enabled: !!guildId,
  });
