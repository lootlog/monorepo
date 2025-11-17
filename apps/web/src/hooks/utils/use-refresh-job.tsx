import { useEffect, useRef, useState } from "react";
import type { RefreshJobUpdate } from "@/types/refresh-job";
import { GatewayEvent } from "@/config/gateway";
import { useGuild } from "@/hooks/api/guilds/use-guild";
import { useGateway } from "@/hooks/utils/use-gateway";

export const useRefreshJob = (
  guildId: string | undefined,
  jobId: number | undefined,
  onRefreshedIds?: (ids: string[]) => void,
  onFailedIds?: (ids: string[]) => void,
) => {
  const [jobStatus, setJobStatus] = useState<RefreshJobUpdate | null>(null);
  const { socket, connected } = useGateway();

  const { data: guild } = useGuild({});
  const currentGuildIdRef = useRef<string | undefined>(null);

  useEffect(() => {
    currentGuildIdRef.current = guild?.id;
  }, [guild?.id]);

  useEffect(() => {
    if (!guildId || !connected) {
      return;
    }

    const handleRefreshJobUpdate = (data: RefreshJobUpdate) => {
      if (currentGuildIdRef.current !== data.guildId) {
        return;
      }

      if (!jobId || data.jobId === jobId) {
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
        handleRefreshJobUpdate,
      );
    };
  }, [guildId, jobId, socket, connected, onRefreshedIds, onFailedIds]);

  return {
    jobStatus,
    socket,
    isConnected: connected,
  };
};
