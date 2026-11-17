import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Context, Effect, Schema } from "effect";
import type { SendChatMessageRequest } from "#src/contracts/chat/schemas";
import type { ChatMessageViewer } from "./chat-message-viewer.js";

export class ChatOperationError extends TaggedErrorClass<ChatOperationError>()(
  "ChatOperationError",
  { cause: Schema.Defect() },
) {}

type DataEffect = Effect.Effect<unknown, ChatOperationError>;

export class ChatData extends Context.Service<
  ChatData,
  {
    readonly getMessages: (
      viewer: ChatMessageViewer,
      guildId: string,
    ) => DataEffect;
    readonly sendMessage: (
      discordId: string,
      guildId: string,
      payload: SendChatMessageRequest,
    ) => DataEffect;
    readonly clearMessages: (
      viewer: ChatMessageViewer,
      guildId: string,
    ) => DataEffect;
    readonly deleteMessage: (
      viewer: ChatMessageViewer,
      guildId: string,
      messageId: string,
    ) => DataEffect;
  }
>()("@lootlog/api/http-api/chat/data") {}
