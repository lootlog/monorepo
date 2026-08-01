import type { PartyReadyRoomClientUpdate } from "@lootlog/types";
import { useEffect } from "react";
import { GatewayEvent } from "@/config/gateway";
import { useSocket } from "@/contexts/socket-context";
import { usePartyFinderStore } from "@/store/party-finder.store";
import { measureLootlogCallback } from "@/lib/performance-monitoring/measured-callback";

export function usePartyReadyRoomSocket(): void {
  const { socket, connected } = useSocket();
  const applyUpdate = usePartyFinderStore((state) => state.applyUpdate);

  useEffect(() => {
    if (!socket || !connected) return;

    const handleUpdate = measureLootlogCallback(
      "socket.party-ready-room-update",
      (update: PartyReadyRoomClientUpdate) => {
        if ((update as { schemaVersion?: number }).schemaVersion !== 3) {
          return;
        }
        applyUpdate(update);
      },
    );
    socket.on(GatewayEvent.PARTY_READY_ROOM_UPDATE, handleUpdate);
    return () => {
      socket.off(GatewayEvent.PARTY_READY_ROOM_UPDATE, handleUpdate);
    };
  }, [socket, connected, applyUpdate]);
}
