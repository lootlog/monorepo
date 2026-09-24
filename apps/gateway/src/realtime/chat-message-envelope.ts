import { canDeleteChatMessage } from "@lootlog/domain/chat-message-permissions";
import { Permission } from "@lootlog/schema/permissions";
import type { ServerEvent } from "@lootlog/protocol/realtime";
import { Option, Schema } from "effect";
import type { UserGuildData } from "#src/guilds/guild";
import type { SessionData } from "#src/realtime/session";

type ChatEvent = Extract<typeof ServerEvent.Type, { type: "chat.created" }>;

export const prepareChatMessagePermissions = (event: ChatEvent) => {
  const payload = Schema.decodeUnknownOption(
    Schema.Struct({ senderId: Schema.String }),
  )(event.data.payload);

  return (session: SessionData, guild: UserGuildData | undefined) => {
    if (Option.isNone(payload)) return { canDelete: false };
    const permissions = guild?.roles.flatMap((role) => role.permissions) ?? [];

    if (guild?.guild.ownerId === session.discordId)
      permissions.push(Permission.OWNER);

    return {
      canDelete: canDeleteChatMessage(
        { discordId: session.discordId, permissions },
        { senderId: payload.value.senderId },
      ),
    };
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
