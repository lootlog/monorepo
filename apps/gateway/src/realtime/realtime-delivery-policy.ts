import type { ServerEvent } from "@lootlog/protocol/realtime";
import type { FederatedRealtimeMessage } from "#src/platform/redis-store";
import { withChatMessagePermissions } from "#src/realtime/chat-message-envelope";
import {
  eventOrganizationId,
  findEventGuild,
} from "#src/realtime/source-event-visibility";
import { isReadyRoomRemoval } from "#src/realtime/npc-event-visibility";
import type { RealtimeAudiences } from "#src/realtime/realtime-audiences";
import type { GatewaySocket, SessionData } from "#src/realtime/session";
import {
  canReadPreciseLocation,
  canSubscribe,
} from "#src/realtime/subscription-policy";

type Event = typeof ServerEvent.Type;

// Pings and loot split choices carry no Organization, so they reach sockets
// only through authorized routing scopes.
export const isPingEvent = (
  event: Event,
): event is Extract<
  Event,
  {
    type:
      | "map-ping.received"
      | "battle-ping.received"
      | "loot-split.received"
      | "loot-split.auto-accepted";
  }
> =>
  event.type === "map-ping.received" ||
  event.type === "battle-ping.received" ||
  event.type === "loot-split.received" ||
  event.type === "loot-split.auto-accepted";

export const canReadOrganization = (
  session: SessionData,
  event: Event,
  guild = findEventGuild(session, eventOrganizationId(event)),
): boolean => {
  if (isReadyRoomRemoval(event)) return true;

  if (event.type === "reservation.changed")
    return event.data.audienceGuildIds.some((organizationId) =>
      session.guilds.some((entry) => entry.guild.id === organizationId),
    );

  return eventOrganizationId(event) === undefined || guild !== undefined;
};

export const prepareScopeVisibility = (
  audiences: RealtimeAudiences,
  message: FederatedRealtimeMessage,
  frame: Event,
): ((socket: GatewaySocket) => boolean) => {
  const scopes = message.scopes ?? (message.scope ? [message.scope] : []);

  // A ping carries no Organization in its payload, so only routing scopes can authorize it.
  if (isPingEvent(frame) && scopes.length === 0) return () => false;
  const organizationId = eventOrganizationId(frame);

  const scopeAudiences = scopes.map((scope) => ({
    scope: {
      ...scope,
      organizationId: scope.organizationId ?? organizationId,
    },
    audiences: audiences.scopeAudiences(scope),
  }));

  return (socket) => {
    const isGatheringOrganizer =
      frame.type === "party-gathering.state-updated" &&
      message.discordId === socket.data.discordId &&
      message.partyGatheringSource?.organizerDiscordId ===
        socket.data.discordId;

    if (
      scopeAudiences.length > 0 &&
      !isGatheringOrganizer &&
      !scopeAudiences.some(
        ({ scope, audiences }) =>
          canSubscribe(socket.data, scope) &&
          audiences.some((audience) => audience.has(socket)),
      )
    )
      return false;

    if (socket.data.apiKeyAccess && isPingEvent(frame))
      return scopes.every(
        (scope) =>
          scope.organizationId !== undefined &&
          socket.data.apiKeyAccess?.organizationIds.includes(
            scope.organizationId,
          ) &&
          socket.data.guilds.some(
            ({ guild }) => guild.id === scope.organizationId,
          ),
      );

    return true;
  };
};

export const matchesRecipient = (
  socket: GatewaySocket,
  message: FederatedRealtimeMessage,
): boolean => {
  if (socket.data.connectionId === message.excludeConnectionId) return false;

  if (
    message.recipientPlatform !== undefined &&
    socket.data.platform !== message.recipientPlatform
  )
    return false;

  if (
    message.recipientWorld !== undefined &&
    socket.data.presence?.character?.world !== message.recipientWorld
  )
    return false;

  if (
    message.recipientMapId !== undefined &&
    socket.data.presence?.location?.mapId !== message.recipientMapId
  )
    return false;

  if (message.recipientCharacterIds !== undefined) {
    const characterId = socket.data.presence?.character?.characterId;

    if (!characterId || !message.recipientCharacterIds.includes(characterId))
      return false;
  }

  return true;
};

export const matchesPresenceAudience = (
  socket: GatewaySocket,
  message: FederatedRealtimeMessage,
): boolean => {
  if (!message.presenceAudience || !message.organizationId) return true;

  return canReadPreciseLocation(socket.data, message.organizationId);
};

/** Encodes a chat event once per permission variant of one delivery. */
export const encodeChatEvent = (
  event: Extract<Event, { type: "chat.created" }>,
  frames: Map<boolean, string>,
  permissions: { canDelete: boolean },
): string => {
  let encoded = frames.get(permissions.canDelete);

  if (encoded === undefined) {
    encoded = JSON.stringify(withChatMessagePermissions(event, permissions));
    frames.set(permissions.canDelete, encoded);
  }

  return encoded;
};
