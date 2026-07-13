import type { PartyReadyRoomProjection } from "@lootlog/types";
import { useEffect } from "react";
import { GatewayEvent } from "@/config/gateway";
import { useSocket } from "@/contexts/socket-context";
import { usePartyFinderStore } from "@/store/party-finder.store";

export function usePartyReadyRoomSocket(): void {
  const { socket, connected } = useSocket();
  const mergeProjection = usePartyFinderStore((state) => state.mergeProjection);

  useEffect(() => {
    if (!socket || !connected) return;

    const handleProjection = (projection: PartyReadyRoomProjection) => {
      mergeProjection(projection);
    };
    socket.on(GatewayEvent.PARTY_READY_ROOM_UPDATE, handleProjection);
    return () => {
      socket.off(GatewayEvent.PARTY_READY_ROOM_UPDATE, handleProjection);
    };
  }, [socket, connected, mergeProjection]);
}
