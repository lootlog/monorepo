import { useEffect, useEffectEvent, useRef, useState } from "react";
import { GatewayEvent } from "@/config/gateway";
import { useGateway } from "@/hooks/utils/use-gateway";
import type { PlayerPresence } from "@/features/guild/events/hooks/socket/use-event-presence";
import {
  applyMemberGamePresenceUpdate,
  mapMemberGamePresenceByDiscordId,
  type MemberGamePresenceByDiscordId,
  type MemberGamePresenceUpdatePayload,
} from "@/features/guild/settings/members/member-game-presence.utils";

type MemberGamePresenceFetchPayload =
  | {
      status: "success";
      players: Record<string, PlayerPresence[]>;
    }
  | {
      status: "forbidden";
      code: "ONLINE_PLAYERS_ACCESS_DENIED";
    };

export const useMemberGamePresence = (guildId: string | undefined) => {
  const { socket, connected, joined } = useGateway();
  const [presenceByDiscordId, setPresenceByDiscordId] = useState<
    MemberGamePresenceByDiscordId | undefined
  >(undefined);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const requestIdRef = useRef(0);

  const requestPresence = useEffectEvent(() => {
    if (!socket || !connected || !joined || !guildId) return;

    const requestId = ++requestIdRef.current;

    socket.emit(
      GatewayEvent.EVENT_PRESENCE_FETCH,
      { guildId },
      (response?: MemberGamePresenceFetchPayload) => {
        if (requestIdRef.current !== requestId || !response) return;

        if (response.status === "forbidden") {
          setPresenceByDiscordId(undefined);
          return;
        }

        setPresenceByDiscordId(
          mapMemberGamePresenceByDiscordId(response.players),
        );
      },
    );
  });

  const handlePresenceUpdate = useEffectEvent(
    (payload: MemberGamePresenceUpdatePayload) => {
      if (payload.guildId !== guildId) return;

      setPresenceByDiscordId((currentPresenceByDiscordId) =>
        applyMemberGamePresenceUpdate(currentPresenceByDiscordId, payload),
      );
    },
  );

  const handlePermissionsUpdated = useEffectEvent(() => {
    requestIdRef.current += 1;
    setPresenceByDiscordId(undefined);
    setRefreshVersion((version) => version + 1);
  });

  useEffect(() => {
    if (!guildId) {
      requestIdRef.current += 1;
      setPresenceByDiscordId(undefined);
    }
  }, [guildId]);

  useEffect(() => {
    if (!socket || !connected || !joined || !guildId) {
      return;
    }

    requestPresence();

    socket.on(GatewayEvent.EVENT_PRESENCE_UPDATE, handlePresenceUpdate);

    return () => {
      socket.off(GatewayEvent.EVENT_PRESENCE_UPDATE, handlePresenceUpdate);
    };
  }, [socket, connected, joined, guildId, refreshVersion]);

  useEffect(() => {
    if (!socket || !connected || !joined) return;

    socket.on(GatewayEvent.PERMISSIONS_UPDATED, handlePermissionsUpdated);

    return () => {
      socket.off(GatewayEvent.PERMISSIONS_UPDATED, handlePermissionsUpdated);
    };
  }, [socket, connected, joined]);

  return presenceByDiscordId;
};
