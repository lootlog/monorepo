import type { GatewayJoin } from "@/lib/gateway-client";
import { useEffect, useEffectEvent } from "react";
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

  const handleJoin = useEffectEvent((payload: GatewayJoin) => {
    // The gateway does not replay progress missed while disconnected.
    if (
      payload.recover &&
      guildId !== undefined &&
      payload.guildIds.includes(guildId)
    )
      onRejoin();
  });

  useEffect(() => {
    if (!guildId) return;
    socket.on("member-refresh.updated", handleUpdate);
    socket.on("join", handleJoin);

    return () => {
      socket.off("member-refresh.updated", handleUpdate);
      socket.off("join", handleJoin);
    };
  }, [guildId, socket]);
};
