import { apiClient, type ApiRequestConfig } from "@/lib/api-client/api-client";
import type { GuildMember } from "@/hooks/api/members/use-guild-member";
import { queryOptions } from "@tanstack/react-query";

type GuildMembersQueryOptionsOptions = {
  includeInactive?: boolean;
  suppressRouteErrorToast?: boolean;
};

export const guildMembersQueryOptions = (
  guildId: string,
  {
    includeInactive = false,
    suppressRouteErrorToast = false,
  }: GuildMembersQueryOptionsOptions = {},
) =>
  queryOptions({
    queryKey: ["members", guildId, includeInactive],
    queryFn: async () => {
      const response = await apiClient.get<GuildMember[]>(
        `/guilds/${guildId}/members`,
        {
          params: { includeInactive: includeInactive.toString() },
          suppressRouteErrorToast,
        } as ApiRequestConfig,
      );

      return response.data;
    },
    enabled: !!guildId,
  });
