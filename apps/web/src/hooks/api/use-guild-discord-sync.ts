import {
  getGuildsControllerGetGuildDiscordSyncStatusQueryKey,
  getGuildsControllerRefreshGuildDiscordSyncMutationKey,
  invalidateNotificationsGuildControllerGetAvailableGuildTargets,
  useGuildsControllerGetGuildDiscordSyncStatus,
  useGuildsControllerRefreshGuildDiscordSync,
} from "@lootlog/client/main";
import { useQueryClient } from "@tanstack/react-query";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { getGuildDiscordPermissionStatus } from "@/features/guild/settings/utils/get-guild-discord-permission-status";

export const useGuildDiscordSync = () => {
  const guildId = useGuildId();
  const queryClient = useQueryClient();

  const query = useGuildsControllerGetGuildDiscordSyncStatus(
    { guildId: guildId ?? "" },
    { query: { enabled: Boolean(guildId), placeholderData: undefined } },
  );

  const refreshMutation = useGuildsControllerRefreshGuildDiscordSync({
    mutation: {
      mutationKey: [
        ...getGuildsControllerRefreshGuildDiscordSyncMutationKey(),
        guildId,
      ],
      onSuccess: async (data, { pathParams }) => {
        queryClient.setQueryData(
          getGuildsControllerGetGuildDiscordSyncStatusQueryKey(pathParams),
          data,
        );
        await invalidateNotificationsGuildControllerGetAvailableGuildTargets(
          queryClient,
          pathParams,
        );
      },
    },
  });

  const isRefreshing =
    refreshMutation.isPending &&
    refreshMutation.variables?.pathParams.guildId === guildId;

  // A later successful read supersedes a failed refresh of the same Organization.
  const isRefreshError =
    refreshMutation.isError &&
    refreshMutation.variables?.pathParams.guildId === guildId &&
    refreshMutation.submittedAt >= query.dataUpdatedAt;

  const refresh = () => {
    if (!guildId || isRefreshing || query.isFetching) return;

    if (query.isError) {
      refreshMutation.reset();
      void query.refetch();

      return;
    }

    refreshMutation.mutate({ pathParams: { guildId } });
  };

  // Keep the last confirmed status while a refresh runs so its controls stay mounted.
  const permissionStatus = getGuildDiscordPermissionStatus(
    query.isError || isRefreshError ? undefined : query.data,
  );

  return {
    guildId,
    query,
    isRefreshing,
    isRefreshError,
    permissionStatus,
    refresh,
  };
};
