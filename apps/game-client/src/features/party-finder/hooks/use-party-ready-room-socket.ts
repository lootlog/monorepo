import type { PartyReadyRoomClientUpdate } from "@lootlog/schema/party-ready-room";
import { useEffect, useEffectEvent } from "react";
import { GatewayEvent } from "@/config/gateway";
import { useSocket } from "@/contexts/socket-context";
import { useReadyRoomsCache } from "@/features/party-finder/hooks/use-ready-rooms-cache";

export function usePartyReadyRoomSocket(): void {
  const { socket, connected } = useSocket();
  const { applyUpdate } = useReadyRoomsCache();

  const handleUpdate = useEffectEvent((update: PartyReadyRoomClientUpdate) => {
    if (update.schemaVersion !== 3) {
      return;
    }

    applyUpdate(update);
  });

  useEffect(() => {
    if (!socket || !connected) return;

    const onUpdate = (update: PartyReadyRoomClientUpdate) => {
      handleUpdate(update);
    };

    socket.on(GatewayEvent.PARTY_READY_ROOM_UPDATE, onUpdate);

    return () => {
      socket.off(GatewayEvent.PARTY_READY_ROOM_UPDATE, onUpdate);
    };
  }, [socket, connected]);
}
