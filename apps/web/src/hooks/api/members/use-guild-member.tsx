import { queryOptions, useQuery } from "@tanstack/react-query";
import { useGuildId } from "@/hooks/context/use-guild-id";
import type { GuildRole } from "@/hooks/api/guilds/use-guild-roles";
import { apiClient, type ApiRequestConfig } from "@/lib/api-client/api-client";

export type GuildMember = {
  id: number;
  name: string;
  avatar: string | null;
  updatedAt: string;
  roles: GuildRole[];
  userId: string;
  globalUserId?: string;
  active: boolean;
  isStale?: boolean;
  staleWarning?: string;
};

export const useGuildMember = () => {
  const guildId = useGuildId();

  return useQuery(guildMemberQueryOptions(guildId ?? ""));
};

type GuildMemberQueryOptionsOptions = {
  suppressRouteErrorToast?: boolean;
};

export const guildMemberQueryOptions = (
  guildId: string,
  { suppressRouteErrorToast = false }: GuildMemberQueryOptionsOptions = {},
) =>
  queryOptions({
    queryKey: ["member", guildId, "@me"],
    queryFn: async () => {
      const response = await apiClient.get<GuildMember>(
        `/guilds/${guildId}/members/@me`,
        {
          suppressRouteErrorToast,
        } as ApiRequestConfig,
      );

      return response.data;
    },
    enabled: !!guildId,
    staleTime: 30_000,
  });
