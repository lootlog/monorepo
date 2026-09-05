import { useEffect, useEffectEvent } from "react";
import { GatewayEvent } from "@/config/gateway";
import type { RefreshJobUpdate } from "@/types/refresh-job";
import { useGateway } from "./use-gateway";

export const useRefreshJobUpdates = (
  guildId: string | undefined,
  onUpdate: (update: RefreshJobUpdate) => void,
) => {
  const { socket, connected } = useGateway();
  const handleUpdate = useEffectEvent((update: RefreshJobUpdate) => {
    if (update.guildId === guildId) onUpdate(update);
  });
  useEffect(() => {
    if (!guildId || !connected) return;
    socket.on(GatewayEvent.MEMBERS_REFRESH_JOB_UPDATE, handleUpdate);
    return () => {
      socket.off(GatewayEvent.MEMBERS_REFRESH_JOB_UPDATE, handleUpdate);
    };
  }, [guildId, connected, socket]);
};
