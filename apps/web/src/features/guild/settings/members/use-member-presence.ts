import { useEffect, useEffectEvent, useRef, useState } from "react";
import { GatewayEvent } from "@/config/gateway";
import { useGateway } from "@/hooks/utils/use-gateway";

type UseMemberPresenceOptions<TPresence, TResponse, TUpdate> = {
  applyUpdate: (
    currentPresence: TPresence | undefined,
    payload: TUpdate,
  ) => TPresence;
  fetchEvent: GatewayEvent;
  guildId: string | undefined;
  mapResponse: (response: TResponse) => TPresence | undefined;
  updateEvent: GatewayEvent;
};

export function useMemberPresence<TPresence, TResponse, TUpdate>({
  applyUpdate,
  fetchEvent,
  guildId,
  mapResponse,
  updateEvent,
}: UseMemberPresenceOptions<TPresence, TResponse, TUpdate>) {
  const { socket, connected, joined } = useGateway();
  const [presence, setPresence] = useState<TPresence>();
  const [refreshVersion, setRefreshVersion] = useState(0);
  const requestIdRef = useRef(0);
  const visibleGuildIdRef = useRef(guildId);

  const requestPresence = useEffectEvent(() => {
    if (!socket || !connected || !joined || !guildId) {
      return;
    }

    const requestId = ++requestIdRef.current;

    socket.emit(fetchEvent, { guildId }, (response?: TResponse) => {
      if (requestIdRef.current !== requestId || !response) {
        return;
      }

      setPresence(mapResponse(response));
    });
  });

  const handlePresenceUpdate = useEffectEvent((payload: TUpdate) => {
    if (
      !payload ||
      typeof payload !== "object" ||
      !("guildId" in payload) ||
      payload.guildId !== guildId
    ) {
      return;
    }

    setPresence((currentPresence) => applyUpdate(currentPresence, payload));
  });

  const handlePermissionsUpdated = useEffectEvent(() => {
    requestIdRef.current += 1;
    setRefreshVersion((version) => version + 1);
  });

  useEffect(() => {
    if (!guildId) {
      requestIdRef.current += 1;
      visibleGuildIdRef.current = guildId;
      setPresence(undefined);
    }
  }, [guildId]);

  useEffect(() => {
    if (!socket || !connected || !joined || !guildId) {
      return;
    }

    if (visibleGuildIdRef.current !== guildId) {
      visibleGuildIdRef.current = guildId;
      setPresence(undefined);
    }

    requestPresence();
    socket.on(updateEvent, handlePresenceUpdate);

    return () => {
      socket.off(updateEvent, handlePresenceUpdate);
    };
  }, [
    socket,
    connected,
    joined,
    guildId,
    refreshVersion,
    fetchEvent,
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

  return presence;
}
