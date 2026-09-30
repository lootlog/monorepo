import { useEffect, useEffectEvent } from "react";
import { GatewayEvent } from "@/config/gateway";
import type { RefreshJobUpdate } from "@/types/refresh-job";
import { useGateway } from "./use-gateway";

export const useRefreshJobUpdates = (
  guildId: string | undefined,
  onUpdate: (update: RefreshJobUpdate) => void,
  onRejoin: () => void,
) => {
  const { socket } = useGateway();

  const handleUpdate = useEffectEvent((update: RefreshJobUpdate) => {
    if (update.guildId === guildId) onUpdate(update);
  });

  const handleJoin = useEffectEvent(
    (payload: {
      status: "success" | "error";
      guildIds: string[];
      recover: boolean;
    }) => {
      // The gateway does not replay progress missed while disconnected.
      if (
        payload.status === "success" &&
        payload.recover &&
        guildId !== undefined &&
        payload.guildIds.includes(guildId)
      )
        onRejoin();
    },
  );

  useEffect(() => {
    if (!guildId) return;
    socket.on(GatewayEvent.MEMBERS_REFRESH_JOB_UPDATE, handleUpdate);
    socket.on(GatewayEvent.JOIN, handleJoin);

    return () => {
      socket.off(GatewayEvent.MEMBERS_REFRESH_JOB_UPDATE, handleUpdate);
      socket.off(GatewayEvent.JOIN, handleJoin);
    };
  }, [guildId, socket]);
};
