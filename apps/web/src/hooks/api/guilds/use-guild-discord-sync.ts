import { useGuildId } from "@/hooks/context/use-guild-id";
import { apiClient } from "@/lib/api-client/api-client";
import type { DiscordGuildSyncState } from "@lootlog/types";
import { queryKeys } from "@/lib/query-keys";
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

export const guildDiscordSyncQueryOptions = (guildId: string) =>
  queryOptions({
    queryKey: queryKeys.guilds.discordSync(guildId),
    queryFn: async () => {
      const response = await apiClient.get<DiscordGuildSyncState>(
        `/guilds/${guildId}/discord-sync`,
      );
      return response;
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
      return response;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.guilds.discordSync(guildId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.guilds.notifications(guildId),
        }),
      ]);
    },
  });
};
