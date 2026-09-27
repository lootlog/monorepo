import { useGuildId } from "@/hooks/context/use-guild-id";
import { useCountdown } from "@/hooks/utils/use-countdown";
import { useRefreshJob } from "@/hooks/utils/use-refresh-job";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { getApiErrorMessage } from "@lootlog/client/transport";
import {
  getMembersControllerGetGuildMembersQueryKey,
  getMembersControllerGetLatestRefreshJobQueryKey,
  useMembersControllerGetLatestRefreshJob,
  type MembersControllerGetLatestRefreshJobQueryResult,
  useMembersControllerRefreshAllMembers,
} from "@lootlog/client/main";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshMembersStatus } from "./refresh-members-status";

const getResolvedGuildId = (guildId: string | undefined) => guildId ?? "";

export const RefreshMembersButton = () => {
  const { t } = useTranslation();
  const guildId = useGuildId();
  const resolvedGuildId = getResolvedGuildId(guildId);
  const queryClient = useQueryClient();

  const latestRefreshJobQuery = useMembersControllerGetLatestRefreshJob(
    { guildId: resolvedGuildId },
    {
      query: {
        queryKey: getMembersControllerGetLatestRefreshJobQueryKey({
          guildId: resolvedGuildId,
        }),
        staleTime: 60_000,
      },
    },
  );

  const refreshAllMembersMutation = useMembersControllerRefreshAllMembers({
    mutation: {
      onSuccess: (data, variables) => {
        const currentGuildId = variables?.pathParams.guildId;

        toast.success(t("settings.members.refreshStarted"));

        if (!currentGuildId) {
          return;
        }

        // Realtime progress can reach the cache before this response.
        queryClient.setQueryData<MembersControllerGetLatestRefreshJobQueryResult>(
          getMembersControllerGetLatestRefreshJobQueryKey({
            guildId: currentGuildId,
          }),
          (cached) => (cached?.id === data.id ? cached : { ...data }),
        );
        void queryClient.invalidateQueries({
          queryKey: getMembersControllerGetGuildMembersQueryKey({
            guildId: currentGuildId,
          }),
        });
      },
      onError: (error, variables) => {
        const message = getApiErrorMessage(error);

        if (message === "BULK_REFRESH_RATE_LIMIT_ACTIVE") {
          const currentGuildId = variables?.pathParams.guildId;

          if (currentGuildId) {
            void queryClient.invalidateQueries({
              queryKey: getMembersControllerGetLatestRefreshJobQueryKey({
                guildId: currentGuildId,
              }),
            });
          }

          toast.error(t("settings.members.refreshRateLimit"));

          return;
        }

        toast.error(t("settings.members.refreshStartError"));
      },
    },
  });

  useRefreshJob();
  const currentJob = latestRefreshJobQuery.data;
  const isPending = refreshAllMembersMutation.isPending;
  const countdown = useCountdown(currentJob?.nextAvailableAt ?? null);

  const handleRefresh = () => {
    if (!guildId) {
      return;
    }

    refreshAllMembersMutation.mutate({
      pathParams: { guildId },
    });
  };

  return (
    <RefreshMembersStatus
      countdown={countdown}
      displayJob={currentJob}
      isPending={isPending}
      onRefresh={handleRefresh}
    />
  );
};
