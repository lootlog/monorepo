import { canDeleteChatMessage } from "@lootlog/domain/chat-message-permissions";
import { Permission } from "@lootlog/schema/permissions";
import type { ServerEvent } from "@lootlog/protocol/realtime";
import { Option, Schema } from "effect";
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

  const payload = Schema.decodeUnknownOption(
    Schema.Struct({ senderId: Schema.String }),
  )(event.data.payload);

  if (Option.isNone(payload)) return { canDelete: false };
  const viewer = { discordId: session.discordId, permissions };
  const message = { senderId: payload.value.senderId };

  return {
    canDelete: canDeleteChatMessage(viewer, message),
  };
};

export const withChatMessagePermissions = (
  event: ChatEvent,
  permissions: { canDelete: boolean },
): ChatEvent => ({
  ...event,
  data: {
    ...event.data,
    payload: {
      ...Option.match(
        Schema.decodeUnknownOption(
          Schema.Record(Schema.String, Schema.Unknown),
        )(event.data.payload),
        {
          onNone: () => permissions,
          onSome: (payload) => ({ ...payload, ...permissions }),
        },
      ),
    },
  },
});
