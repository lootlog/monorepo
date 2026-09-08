import type { PlayerPresenceResponse } from "@/lib/gateway-client";
import { GatewayEvent } from "@/config/gateway";
import {
  applyMemberGamePresenceUpdate,
  mapMemberGamePresenceByDiscordId,
} from "./member-game-presence.utils";
import { useMemberPresence } from "./use-member-presence";

export const useMemberGamePresence = (guildId: string | undefined) =>
  useMemberPresence({
    applyUpdate: applyMemberGamePresenceUpdate,
    fetchPresence: (socket, organizationId, acknowledgement) =>
      socket.emit(
        GatewayEvent.EVENT_PRESENCE_FETCH,
        { guildId: organizationId },
        acknowledgement,
      ),
    guildId,
    mapResponse: (response: PlayerPresenceResponse) =>
      response.status === "success"
        ? mapMemberGamePresenceByDiscordId(response.players)
        : undefined,
    updateEvent: GatewayEvent.EVENT_PRESENCE_UPDATE,
  });
