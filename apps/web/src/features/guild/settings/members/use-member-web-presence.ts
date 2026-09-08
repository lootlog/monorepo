import type { WebPresenceResponse } from "@/lib/gateway-client";
import { GatewayEvent } from "@/config/gateway";
import {
  applyMemberWebPresenceUpdate,
  mapMemberWebPresenceByDiscordId,
} from "./member-web-presence.utils";
import { useMemberPresence } from "./use-member-presence";
export const useMemberWebPresence = (guildId: string | undefined) =>
  useMemberPresence({
    applyUpdate: applyMemberWebPresenceUpdate,
    fetchPresence: (socket, organizationId, acknowledgement) =>
      socket.emit(
        GatewayEvent.MEMBER_WEB_PRESENCE_FETCH,
        { guildId: organizationId },
        acknowledgement,
      ),
    guildId,
    mapResponse: (response: WebPresenceResponse) =>
      response.status === "success"
        ? mapMemberWebPresenceByDiscordId(response.sessions)
        : undefined,
    updateEvent: GatewayEvent.MEMBER_WEB_PRESENCE_UPDATE,
  });
