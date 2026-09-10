import type { ServerEvent } from "@lootlog/protocol/realtime";
import { Option, Schema } from "effect";
import type { SessionData } from "./session.js";

const SharedRoom = Schema.Struct({
  room: Schema.Struct({ guildIds: Schema.Array(Schema.String) }),
});

const readSharedRoom = Schema.decodeUnknownOption(SharedRoom);

/** Check payload scope even for direct user delivery, which bypasses subscription audiences. */
export function canReadApiKeyEvent(
  session: SessionData,
  event: ServerEvent,
): boolean {
  const access = session.apiKeyAccess;

  if (!access) return true;

  const allowed = (id: string) =>
    access.organizationIds.includes(id) &&
    session.guilds.some(({ guild }) => guild.id === id);

  switch (event.type) {
    case "session.joined":
    case "permissions.updated":
      return event.data.organizationIds.every((id) =>
        access.organizationIds.includes(id),
      );
    case "notification.volunteer":
      return false;
    case "reservation.changed":
      return (
        allowed(event.data.sourceGuildId) &&
        event.data.audienceGuildIds.every(allowed)
      );
    case "party-ready-room.updated": {
      const room = readSharedRoom(event.data.payload);

      return (
        allowed(event.data.organizationId) &&
        Option.isSome(room) &&
        room.value.room.guildIds.every(allowed)
      );
    }

    case "feed.entry":
      return allowed(event.data.guild.id);
    case "map-ping.received":
      // Its payload has no Organization: the hub checks the authoritative routing scope.
      return true;
    default:
      if ("organizationId" in event.data)
        return allowed(event.data.organizationId);

      if ("guildId" in event.data) return allowed(event.data.guildId);

      return false;
  }
}
