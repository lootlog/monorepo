import { useGuildId } from "@/hooks/context/use-guild-id";
import { useRefreshStatus } from "@/features/guild/settings/members/contexts/refresh-status-context";
import { useCountdown } from "@/hooks/utils/use-countdown";
import { useRefreshJob } from "@/hooks/utils/use-refresh-job";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { getApiErrorMessage } from "@lootlog/client/transport";
import {
  getMembersControllerGetGuildMembersQueryKey,
  getMembersControllerGetLatestRefreshJobQueryKey,
  useMembersControllerGetLatestRefreshJob,
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
  const { markAsRefreshed, markAsFailed } = useRefreshStatus();

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

        queryClient.setQueryData(
          getMembersControllerGetLatestRefreshJobQueryKey({
            guildId: currentGuildId,
          }),
          data,
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

  const currentJob = latestRefreshJobQuery.data;
  const isPending = refreshAllMembersMutation.isPending;
  const nextAvailableAt = currentJob?.nextAvailableAt ?? null;
  const countdown = useCountdown(nextAvailableAt);
  const currentJobId = countdown.isExpired ? undefined : currentJob?.id;

  const { jobStatus } = useRefreshJob(
    guildId,
    currentJobId,
    markAsRefreshed,
    markAsFailed,
  );

  const displayJob = jobStatus ?? currentJob;

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
      displayJob={displayJob}
      isPending={isPending}
      onRefresh={handleRefresh}
    />
  );
};
