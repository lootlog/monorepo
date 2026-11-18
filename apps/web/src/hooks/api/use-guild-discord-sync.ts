import {
  getGuildsControllerGetGuildDiscordSyncStatusQueryKey,
  getGuildsControllerRefreshGuildDiscordSyncMutationKey,
  invalidateNotificationsGuildControllerGetAvailableGuildTargets,
  useGuildsControllerGetGuildDiscordSyncStatus,
  useGuildsControllerRefreshGuildDiscordSync,
} from "@lootlog/client/main";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@lootlog/ui/lib/toast";
import { useTranslation } from "react-i18next";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useCountdown } from "@/hooks/utils/use-countdown";
import { getGuildDiscordPermissionStatus } from "@/features/guild/settings/utils/get-guild-discord-permission-status";

export const useGuildDiscordSync = () => {
  const guildId = useGuildId();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

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
      onError: (error) => {
        // Without a deadline there is no countdown to show.
        if (error.status === 429 && error.retryAt === undefined) {
          toast.error(t("common.cooldown.rateLimited"));
        }
      },
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

  const hasRefreshFailure =
    refreshMutation.isError &&
    refreshMutation.variables?.pathParams.guildId === guildId;

  // A refused refresh (cooldown) read nothing new, so the last status stands,
  // and the server's deadline holds even after a later status read.
  const isRefreshRateLimited =
    hasRefreshFailure && refreshMutation.error.status === 429;

  // A later successful read supersedes a failed refresh of the same Organization.
  const isRefreshError =
    hasRefreshFailure &&
    !isRefreshRateLimited &&
    refreshMutation.submittedAt >= query.dataUpdatedAt;

  const refreshCooldown = useCountdown(
    isRefreshRateLimited ? refreshMutation.error.retryAt : null,
  );

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
    refreshCooldown,
    permissionStatus,
    refresh,
  };
};
