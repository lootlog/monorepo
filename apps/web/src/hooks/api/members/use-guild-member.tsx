import { queryOptions, useQuery } from "@tanstack/react-query";
import { useGuildId } from "@/hooks/context/use-guild-id";
import type { GuildRole } from "@/hooks/api/guilds/use-guild-roles";
import { apiClient } from "@/lib/api-client/api-client";
import { queryKeys } from "@/lib/query-keys";

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

export const guildMemberQueryOptions = (guildId: string) =>
  queryOptions({
    queryKey: queryKeys.members.current(guildId),
    queryFn: async () => {
      const response = await apiClient.get<GuildMember>(
        `/guilds/${guildId}/members/@me`,
      );

      return response;
    },
    enabled: !!guildId,
    staleTime: 30_000,
  });
