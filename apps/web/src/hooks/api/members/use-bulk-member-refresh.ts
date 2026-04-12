import { useApiClient } from "@/hooks/api/use-api-client";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getApiErrorMessage } from "@/lib/api-client/api-client";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";

export interface RefreshJob {
  id: number;
  guildId: string;
  requestedBy: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  totalMembers: number;
  processedMembers: number;
  failedMembers: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export const useLatestRefreshJob = () => {
  const guildId = useGuildId();
  const { client } = useApiClient();

  return useQuery({
    queryKey: queryKeys.members.latestRefreshJob(guildId),
    queryFn: async () => {
      try {
        const response = await client.get<RefreshJob>(
          `/guilds/${guildId}/members/refresh-jobs/latest`,
        );
        return response;
      } catch {
        return null;
      }
    },
    enabled: !!guildId,
    staleTime: 60000, // 1 minute
  });
};

export const useBulkMemberRefresh = () => {
  const guildId = useGuildId();
  const { client } = useApiClient();
  const queryClient = useQueryClient();
  const { data: latestJob } = useLatestRefreshJob();

  const mutation = useMutation({
    mutationFn: () =>
      client.post<RefreshJob>(`/guilds/${guildId}/members/refresh-all`),
    onSuccess: () => {
      toast.success("Rozpoczęto odświeżanie wszystkich członków.");
      queryClient.invalidateQueries({
        queryKey: queryKeys.members.list(guildId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.members.latestRefreshJob(guildId),
      });
    },
    onError: (error: unknown) => {
      const message = getApiErrorMessage(error);
      if (message === "BULK_REFRESH_RATE_LIMIT_ACTIVE") {
        toast.error("Musisz poczekać przed kolejnym odświeżeniem.");
      } else {
        toast.error("Wystąpił błąd podczas rozpoczynania odświeżania.");
      }
    },
  });

  return {
    ...mutation,
    latestJob,
  };
};

export const useRefreshJobStatus = (jobId: number | undefined) => {
  const guildId = useGuildId();
  const { client } = useApiClient();

  return useQuery({
    queryKey: queryKeys.members.refreshJob(guildId, jobId),
    queryFn: async () => {
      if (!jobId) return null;
      const response = await client.get<RefreshJob>(
        `/guilds/${guildId}/members/refresh-jobs/${jobId}`,
      );
      return response;
    },
    enabled: !!jobId && !!guildId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data || data.status === "COMPLETED" || data.status === "FAILED") {
        return false;
      }
      return 2000;
    },
  });
};
