import { useEffect, useState } from "react";
import { RefreshJobUpdate } from "@/types/refresh-job";
import { GatewayEvent } from "@/config/gateway";
import { useGateway } from "@/hooks/utils/use-gateway";

export const useRefreshJob = (
  guildId: string | undefined,
  jobId: number | undefined,
  onRefreshedIds?: (ids: string[]) => void,
  onFailedIds?: (ids: string[]) => void
) => {
  const [jobStatus, setJobStatus] = useState<RefreshJobUpdate | null>(null);
  const { socket, connected } = useGateway();

  useEffect(() => {
    if (!guildId || !connected) {
      return;
    }

    const handleRefreshJobUpdate = (data: RefreshJobUpdate) => {
      if (!jobId || data.jobId === jobId) {
        console.log("[useRefreshJob] Received job update:", data);
        setJobStatus(data);

        if (data.refreshedIds && data.refreshedIds.length > 0) {
          onRefreshedIds?.(data.refreshedIds);
        }

        if (data.failedIds && data.failedIds.length > 0) {
          onFailedIds?.(data.failedIds);
        }
      }
    };

    socket.on(GatewayEvent.MEMBERS_REFRESH_JOB_UPDATE, handleRefreshJobUpdate);

    return () => {
      socket.off(
        GatewayEvent.MEMBERS_REFRESH_JOB_UPDATE,
        handleRefreshJobUpdate
      );
    };
  }, [guildId, jobId, socket, connected, onRefreshedIds, onFailedIds]);

  return {
    jobStatus,
    socket,
    isConnected: connected,
  };
};
