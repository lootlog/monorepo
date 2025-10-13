import { useEffect, useState } from 'react';
import { RefreshJobUpdate } from '@/types/refresh-job';
import { useGateway } from '@/hooks/use-gateway';
import { GatewayEvent } from '@/config/gateway';

export const useRefreshJob = (guildId: string | undefined, jobId: number | undefined) => {
  const [jobStatus, setJobStatus] = useState<RefreshJobUpdate | null>(null);
  const { socket, connected } = useGateway();

  useEffect(() => {
    if (!guildId || !connected) {
      return;
    }

    const handleRefreshJobUpdate = (data: RefreshJobUpdate) => {
      if (!jobId || data.jobId === jobId) {
        console.log('[useRefreshJob] Received job update:', data);
        setJobStatus(data);
      }
    };

    socket.on(GatewayEvent.MEMBERS_REFRESH_JOB_UPDATE, handleRefreshJobUpdate);

    return () => {
      socket.off(GatewayEvent.MEMBERS_REFRESH_JOB_UPDATE, handleRefreshJobUpdate);
    };
  }, [guildId, jobId, socket, connected]);

  return {
    jobStatus,
    socket,
    isConnected: connected,
  };
};
