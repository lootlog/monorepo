/** Input and output schemas for the cross-Organization global chat. */
import * as Schema from "effect/Schema";
import {
  GlobalChatMessageSchema,
  GlobalChatMessageText,
} from "@lootlog/schema/chat";

export const GlobalChatMessageResponse = Schema.Struct({
  ...GlobalChatMessageSchema.fields,
  isOwn: Schema.Boolean,
}).annotate({ identifier: "GlobalChatMessageResponse" });

export type GlobalChatMessageResponse = typeof GlobalChatMessageResponse.Type;

export const GlobalChatMessagesResponse = Schema.Struct({
  /** Oldest first, ending with the newest message older than the cursor. */
  messages: Schema.Array(GlobalChatMessageResponse),
  /** Pass as `before` to read the previous page; null at the oldest kept message. */
  nextCursor: Schema.NullOr(Schema.String),
}).annotate({ identifier: "GlobalChatMessagesResponse" });

export type GlobalChatMessagesResponse = typeof GlobalChatMessagesResponse.Type;

export const GlobalChatMessagesQuery = Schema.Struct({
  before: Schema.optionalKey(
    Schema.String.check(Schema.isPattern(/^[1-9]\d{0,15}$/)),
  ),
});

export const SendGlobalChatMessageRequest = Schema.Struct({
  message: GlobalChatMessageText,
}).annotate({ identifier: "SendGlobalChatMessageRequest" });

export type SendGlobalChatMessageRequest =
  typeof SendGlobalChatMessageRequest.Type;
