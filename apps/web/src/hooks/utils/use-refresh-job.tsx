import { useQueryClient } from "@tanstack/react-query";
import { useRefreshJobUpdates } from "./use-refresh-job-updates";
import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  getMembersControllerGetLatestRefreshJobQueryKey,
  useGuildsControllerGetGuildById,
  type MembersControllerGetLatestRefreshJobQueryResult,
} from "@lootlog/client/main";

export const useRefreshJob = () => {
  const queryClient = useQueryClient();
  const routeGuildId = useGuildId() ?? "";

  const { data: guild } = useGuildsControllerGetGuildById({
    guildId: routeGuildId,
  });

  const queryKey = getMembersControllerGetLatestRefreshJobQueryKey({
    guildId: routeGuildId,
  });

  useRefreshJobUpdates(
    guild?.id,
    async (update) => {
      const job =
        queryClient.getQueryData<MembersControllerGetLatestRefreshJobQueryResult>(
          queryKey,
        );

      if (job?.id !== update.jobId) {
        void queryClient.invalidateQueries(
          { queryKey },
          { cancelRefetch: false },
        );

        return;
      }

      await queryClient.cancelQueries({ queryKey });
      queryClient.setQueryData<MembersControllerGetLatestRefreshJobQueryResult>(
        queryKey,
        (cached) =>
          cached?.id === update.jobId
            ? {
                ...cached,
                status: update.status,
                totalMembers: update.totalMembers,
                processedMembers: update.processedMembers,
                failedMembers: update.failedMembers,
              }
            : cached,
      );
    },
    () => void queryClient.invalidateQueries({ queryKey }),
  );
};
