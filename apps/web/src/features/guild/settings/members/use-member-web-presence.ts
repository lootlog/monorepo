import { useEffect, useEffectEvent, useRef, useState } from "react";
import { GatewayEvent } from "@/config/gateway";
import { useGateway } from "@/hooks/utils/use-gateway";
import {
  applyMemberWebPresenceUpdate,
  mapMemberWebPresenceByDiscordId,
  type MemberWebPresenceByDiscordId,
  type MemberWebPresenceSession,
  type MemberWebPresenceUpdatePayload,
} from "@/features/guild/settings/members/member-web-presence.utils";

type MemberWebPresenceFetchPayload =
  | {
      status: "success";
      sessions: Record<string, MemberWebPresenceSession[]>;
    }
  | {
      status: "forbidden";
      code: "ONLINE_PLAYERS_ACCESS_DENIED";
    };

export const useMemberWebPresence = (guildId: string | undefined) => {
  const { socket, connected, joined } = useGateway();
  const [presenceByDiscordId, setPresenceByDiscordId] = useState<
    MemberWebPresenceByDiscordId | undefined
  >(undefined);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const requestIdRef = useRef(0);
  const visibleGuildIdRef = useRef(guildId);

  const requestPresence = useEffectEvent(() => {
    if (!socket || !connected || !joined || !guildId) return;

    const requestId = ++requestIdRef.current;

    socket.emit(
      GatewayEvent.MEMBER_WEB_PRESENCE_FETCH,
      { guildId },
      (response?: MemberWebPresenceFetchPayload) => {
        if (requestIdRef.current !== requestId || !response) return;

        if (response.status === "forbidden") {
          setPresenceByDiscordId(undefined);
          return;
        }

        setPresenceByDiscordId(
          mapMemberWebPresenceByDiscordId(response.sessions),
        );
      },
    );
  });

  const handlePresenceUpdate = useEffectEvent(
    (payload: MemberWebPresenceUpdatePayload) => {
      if (payload.guildId !== guildId) return;

      setPresenceByDiscordId((currentPresenceByDiscordId) =>
        applyMemberWebPresenceUpdate(currentPresenceByDiscordId, payload),
      );
    },
  );

  const handlePermissionsUpdated = useEffectEvent(() => {
    requestIdRef.current += 1;
    setRefreshVersion((version) => version + 1);
  });

  useEffect(() => {
    if (!guildId) {
      requestIdRef.current += 1;
      visibleGuildIdRef.current = guildId;
      setPresenceByDiscordId(undefined);
    }
  }, [guildId]);

  useEffect(() => {
    if (!socket || !connected || !joined || !guildId) {
      return;
    }

    if (visibleGuildIdRef.current !== guildId) {
      visibleGuildIdRef.current = guildId;
      setPresenceByDiscordId(undefined);
    }

    requestPresence();

    socket.on(GatewayEvent.MEMBER_WEB_PRESENCE_UPDATE, handlePresenceUpdate);

    return () => {
      socket.off(GatewayEvent.MEMBER_WEB_PRESENCE_UPDATE, handlePresenceUpdate);
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
