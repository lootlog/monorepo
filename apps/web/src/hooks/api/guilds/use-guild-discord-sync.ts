import { useGuildId } from "@/hooks/context/use-guild-id";
import { apiClient, type ApiRequestConfig } from "@/lib/api-client/api-client";
import type { DiscordGuildSyncState } from "@lootlog/types";
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

type GuildDiscordSyncQueryOptionsOptions = {
  suppressRouteErrorToast?: boolean;
};

export const guildDiscordSyncQueryOptions = (
  guildId: string,
  { suppressRouteErrorToast = false }: GuildDiscordSyncQueryOptionsOptions = {},
) =>
  queryOptions({
    queryKey: ["guild-discord-sync", guildId],
    queryFn: async () => {
      const response = await apiClient.get<DiscordGuildSyncState>(
        `/guilds/${guildId}/discord-sync`,
        {
          suppressRouteErrorToast,
        } as ApiRequestConfig,
      );
      return response.data;
    },
    enabled: !!guildId,
  });

export const useGuildDiscordSync = () => {
  const guildId = useGuildId();

  return useQuery({
    ...guildDiscordSyncQueryOptions(guildId ?? ""),
  });
};

export const useRefreshGuildDiscordSync = () => {
  const guildId = useGuildId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post(
        `/guilds/${guildId}/discord-sync/refresh`,
      );
      return response.data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["guild-discord-sync", guildId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["guild-notifications", guildId],
        }),
      ]);
    },
  });
};
