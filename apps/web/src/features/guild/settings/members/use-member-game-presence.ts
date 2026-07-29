import { GatewayEvent } from "@/config/gateway";
import type { PlayerPresence } from "@/features/guild/events/hooks/socket/use-event-presence";
import {
  applyMemberGamePresenceUpdate,
  mapMemberGamePresenceByDiscordId,
} from "./member-game-presence.utils";
import { useMemberPresence } from "./use-member-presence";

type MemberGamePresenceFetchPayload =
  | {
      status: "success";
      players: Record<string, PlayerPresence[]>;
    }
  | {
      status: "forbidden";
      code: "ONLINE_PLAYERS_ACCESS_DENIED";
    };

export const useMemberGamePresence = (guildId: string | undefined) =>
  useMemberPresence({
    applyUpdate: applyMemberGamePresenceUpdate,
    fetchEvent: GatewayEvent.EVENT_PRESENCE_FETCH,
    guildId,
    mapResponse: (response: MemberGamePresenceFetchPayload) =>
      response.status === "success"
        ? mapMemberGamePresenceByDiscordId(response.players)
        : undefined,
    updateEvent: GatewayEvent.EVENT_PRESENCE_UPDATE,
  });
