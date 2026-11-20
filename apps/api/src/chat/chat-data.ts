import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Context, Effect, Schema } from "effect";
import type {
  ChatMessageActionResponse,
  ChatMessageResponse,
  SendChatMessageRequest,
} from "#src/contracts/chat/schemas";
import type { ChatMessageViewer } from "./chat-message-viewer.js";
import type { ChatStoredMessage } from "./chat-stored-message.js";

export class ChatOperationError extends TaggedErrorClass<ChatOperationError>()(
  "ChatOperationError",
  { cause: Schema.Defect() },
) {}

type DataEffect<A> = Effect.Effect<A, ChatOperationError>;

export class ChatData extends Context.Service<
  ChatData,
  {
    readonly getMessages: (
      viewer: ChatMessageViewer,
      guildId: string,
    ) => DataEffect<
      ReadonlyArray<ChatStoredMessage & { readonly canDelete: boolean }>
    >;
    readonly sendMessage: (
      discordId: string,
      guildId: string,
      payload: SendChatMessageRequest,
    ) => DataEffect<ChatMessageResponse>;
    readonly clearMessages: (
      viewer: ChatMessageViewer,
      guildId: string,
    ) => DataEffect<ChatMessageActionResponse>;
    readonly deleteMessage: (
      viewer: ChatMessageViewer,
      guildId: string,
      messageId: string,
    ) => DataEffect<ChatMessageActionResponse>;
  }
>()("@lootlog/api/http-api/chat/data") {}
