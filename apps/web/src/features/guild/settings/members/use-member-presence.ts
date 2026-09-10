import type { GatewayClient } from "@/lib/gateway-client";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { GatewayEvent } from "@/config/gateway";
import { useGateway } from "@/hooks/utils/use-gateway";

type UseMemberPresenceOptions<TPresence, TResponse, TUpdate> = {
  applyUpdate: (
    currentPresence: TPresence | undefined,
    payload: TUpdate,
  ) => TPresence;
  fetchPresence: (
    socket: GatewayClient,
    guildId: string,
    acknowledgement: (response?: TResponse) => void,
  ) => void;
  guildId: string | undefined;
  mapResponse: (response: TResponse) => TPresence | undefined;
  updateEvent: GatewayEvent;
};

export function useMemberPresence<
  TPresence,
  TResponse,
  TUpdate extends { guildId: string },
>({
  applyUpdate,
  fetchPresence,
  guildId,
  mapResponse,
  updateEvent,
}: UseMemberPresenceOptions<TPresence, TResponse, TUpdate>) {
  const { socket, connected, joined } = useGateway();
  const [presence, setPresence] = useState<{
    guildId: string;
    value: TPresence | undefined;
  }>();
  const [refreshVersion, setRefreshVersion] = useState(0);
  const requestIdRef = useRef(0);

  const requestPresence = useEffectEvent(() => {
    if (!socket || !connected || !joined || !guildId) {
      return;
    }

    const requestId = ++requestIdRef.current;

    fetchPresence(socket, guildId, (response?: TResponse) => {
      if (requestIdRef.current !== requestId || !response) {
        return;
      }

      setPresence({ guildId, value: mapResponse(response) });
    });
  });

  const handlePresenceUpdate = useEffectEvent((payload: TUpdate) => {
    if (payload?.guildId !== guildId) {
      return;
    }

    setPresence((currentPresence) => ({
      guildId: payload.guildId,
      value: applyUpdate(
        currentPresence?.guildId === payload.guildId
          ? currentPresence.value
          : undefined,
        payload,
      ),
    }));
  });

  const handlePermissionsUpdated = useEffectEvent(() => {
    requestIdRef.current += 1;
    setRefreshVersion((version) => version + 1);
  });

  useEffect(() => {
    if (!socket || !connected || !joined || !guildId) {
      return;
    }

    requestPresence();
    socket.on(updateEvent, handlePresenceUpdate);

    return () => {
      requestIdRef.current += 1;
      socket.off(updateEvent, handlePresenceUpdate);
    };
  }, [
    socket,
    connected,
    joined,
    guildId,
    refreshVersion,
    fetchPresence,
    updateEvent,
  ]);

  useEffect(() => {
    if (!socket || !connected || !joined) {
      return;
    }

    socket.on(GatewayEvent.PERMISSIONS_UPDATED, handlePermissionsUpdated);

    return () => {
      socket.off(GatewayEvent.PERMISSIONS_UPDATED, handlePermissionsUpdated);
    };
  }, [socket, connected, joined]);

  return guildId && presence?.guildId === guildId ? presence.value : undefined;
}
