import { useApiClient } from "@/hooks/api/use-api-client";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { toast } from "sonner";

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
    queryKey: ["latest-refresh-job", guildId],
    queryFn: async () => {
      try {
        const response = await client.get<RefreshJob>(
          `/guilds/${guildId}/members/refresh-jobs/latest`
        );
        return response.data;
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
        queryKey: ["members", guildId],
      });
      queryClient.invalidateQueries({
        queryKey: ["latest-refresh-job", guildId],
      });
    },
    onError: (error: AxiosError<{ message: string }>) => {
      const message = error?.response?.data?.message;
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
    queryKey: ["refresh-job", guildId, jobId],
    queryFn: async () => {
      if (!jobId) return null;
      const response = await client.get<RefreshJob>(
        `/guilds/${guildId}/members/refresh-jobs/${jobId}`
      );
      return response.data;
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
