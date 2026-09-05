import { useState } from "react";
import type { RefreshJobUpdate } from "@/types/refresh-job";
import { useRefreshJobUpdates } from "./use-refresh-job-updates";
import { useGateway } from "@/hooks/utils/use-gateway";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useGuildsControllerGetGuildById } from "@lootlog/client/main";

export const useRefreshJob = (
  guildId: string | undefined,
  jobId: number | undefined,
  onRefreshedIds?: (ids: string[]) => void,
  onFailedIds?: (ids: string[]) => void,
) => {
  const [jobStatus, setJobStatus] = useState<RefreshJobUpdate | null>(null);
  const { socket, connected } = useGateway();
  const currentRouteGuildId = useGuildId();
  const { data: guild } = useGuildsControllerGetGuildById({
    guildId: currentRouteGuildId ?? "",
  });
  useRefreshJobUpdates(guildId ? guild?.id : undefined, (data) => {
    if (!jobId || data.jobId === jobId) {
      setJobStatus(data);
      if (data.refreshedIds?.length) onRefreshedIds?.(data.refreshedIds);
      if (data.failedIds?.length) onFailedIds?.(data.failedIds);
    }
  });

  return {
    jobStatus,
    socket,
    isConnected: connected,
  };
};
