import {
  canDeleteChatMessage,
  canEditChatMessage,
} from "@lootlog/domain/chat-message-permissions";
import { Permission } from "@lootlog/schema/permissions";
import type { ServerEvent } from "@lootlog/protocol/realtime";
import { Predicate } from "effect";
import type { SessionData } from "#src/realtime/session";

type ChatEvent = Extract<typeof ServerEvent.Type, { type: "chat.created" }>;

export const chatMessagePermissions = (
  session: SessionData,
  event: ChatEvent,
) => {
  const guild = session.guilds.find(
    (entry) => entry.guild.id === event.data.organizationId,
  );
  const permissions = guild?.roles.flatMap((role) => role.permissions) ?? [];
  if (guild?.guild.ownerId === session.discordId)
    permissions.push(Permission.OWNER);
  const payload = event.data.payload;
  if (!Predicate.isObject(payload) || typeof payload.senderId !== "string")
    return { canEdit: false, canDelete: false };
  const viewer = { discordId: session.discordId, permissions };
  const message = { senderId: payload.senderId };
  return {
    canEdit: canEditChatMessage(viewer, message),
    canDelete: canDeleteChatMessage(viewer, message),
  };
};

export const withChatMessagePermissions = (
  event: ChatEvent,
  permissions: { canEdit: boolean; canDelete: boolean },
): ChatEvent => ({
  ...event,
  data: {
    ...event.data,
    payload: {
      ...(Predicate.isObject(event.data.payload) ? event.data.payload : {}),
      ...permissions,
    },
  },
});
