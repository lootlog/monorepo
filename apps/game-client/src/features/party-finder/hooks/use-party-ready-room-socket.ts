import {
  decodePartyReadyRoomClientUpdate,
  type PartyReadyRoomClientUpdate,
} from "@lootlog/schema/party-ready-room";
import { useEffect, useEffectEvent } from "react";
import { GatewayEvent } from "@/config/gateway";
import { useSocket } from "@/contexts/socket-context";
import { useReadyRoomsCache } from "@/features/party-finder/hooks/use-ready-rooms-cache";

export function usePartyReadyRoomSocket(): void {
  const { socket, connected } = useSocket();
  const { applyUpdate } = useReadyRoomsCache();

  // Gateway payloads are unchecked until here; an update this client cannot
  // decode, such as a newer schema version, is skipped.
  const handleUpdate = useEffectEvent((payload: PartyReadyRoomClientUpdate) => {
    let update: PartyReadyRoomClientUpdate;

    try {
      update = decodePartyReadyRoomClientUpdate(payload);
    } catch {
      return;
    }

    applyUpdate(update);
  });

  useEffect(() => {
    if (!socket || !connected) return;

    const onUpdate = (payload: PartyReadyRoomClientUpdate) => {
      handleUpdate(payload);
    };

    socket.on(GatewayEvent.PARTY_READY_ROOM_UPDATE, onUpdate);

    return () => {
      socket.off(GatewayEvent.PARTY_READY_ROOM_UPDATE, onUpdate);
    };
  }, [socket, connected]);
}
