import { GatewayEvent } from "@/config/gateway";
import {
  applyMemberWebPresenceUpdate,
  mapMemberWebPresenceByDiscordId,
  type MemberWebPresenceSession,
} from "./member-web-presence.utils";
import { useMemberPresence } from "./use-member-presence";

type MemberWebPresenceFetchPayload =
  | {
      status: "success";
      sessions: Record<string, MemberWebPresenceSession[]>;
    }
  | {
      status: "forbidden";
      code: "ONLINE_PLAYERS_ACCESS_DENIED";
    };

export const useMemberWebPresence = (guildId: string | undefined) =>
  useMemberPresence({
    applyUpdate: applyMemberWebPresenceUpdate,
    fetchEvent: GatewayEvent.MEMBER_WEB_PRESENCE_FETCH,
    guildId,
    mapResponse: (response: MemberWebPresenceFetchPayload) =>
      response.status === "success"
        ? mapMemberWebPresenceByDiscordId(response.sessions)
        : undefined,
    updateEvent: GatewayEvent.MEMBER_WEB_PRESENCE_UPDATE,
  });
