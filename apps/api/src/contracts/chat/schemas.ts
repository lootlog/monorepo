/** Shared input and output schemas for the chat feature. */
import * as Schema from "effect/Schema";
import {
  NonEmptyString,
  JsonValue,
  DateTimeString,
  FiniteNumber,
} from "@lootlog/schema/http-scalars";

const ChatCharacter = Schema.Struct({
  nick: NonEmptyString,
  id: FiniteNumber,
  acc: FiniteNumber,
  lvl: FiniteNumber,
  prof: NonEmptyString,
  icon: NonEmptyString,
});

const ChatNpc = Schema.Struct({
  id: FiniteNumber,
  name: NonEmptyString,
  location: NonEmptyString,
  lvl: FiniteNumber,
  prof: NonEmptyString,
  wt: FiniteNumber,
  hpp: Schema.optionalKey(FiniteNumber),
  icon: NonEmptyString,
  type: FiniteNumber,
  x: Schema.optionalKey(FiniteNumber),
  y: Schema.optionalKey(FiniteNumber),
});

const PartyGathering = Schema.Struct({
  notificationId: NonEmptyString,
  discordId: NonEmptyString,
  description: Schema.optionalKey(
    Schema.String.check(
      Schema.isMaxLength(200).annotate({
        expected: "a value with a length of at most 200",
      }),
    ),
  ),
  minLvl: Schema.optionalKey(
    FiniteNumber.check(
      Schema.isGreaterThanOrEqualTo(1).annotate({
        expected: "a value greater than or equal to 1",
      }),
    ).check(
      Schema.isLessThanOrEqualTo(500).annotate({
        expected: "a value less than or equal to 500",
      }),
    ),
  ),
  maxLvl: Schema.optionalKey(
    FiniteNumber.check(
      Schema.isGreaterThanOrEqualTo(1).annotate({
        expected: "a value greater than or equal to 1",
      }),
    ).check(
      Schema.isLessThanOrEqualTo(500).annotate({
        expected: "a value less than or equal to 500",
      }),
    ),
  ),
  world: NonEmptyString.check(
    Schema.isMaxLength(50).annotate({
      expected: "a value with a length of at most 50",
    }),
  ),
});

const ChatReply = Schema.Struct({
  messageId: NonEmptyString,
  senderNick: NonEmptyString,
  message: Schema.String.check(
    Schema.isMaxLength(128).annotate({
      expected: "a value with a length of at most 128",
    }),
  ),
  type: Schema.Literals(["NORMAL", "NOTIFICATION"]),
});

export type ChatMessageResponse = typeof ChatMessageResponse.Type;

export const ChatMessageResponse = Schema.Struct({
  id: NonEmptyString,
  guildId: NonEmptyString,
  message: Schema.String.check(
    Schema.isMaxLength(128).annotate({
      expected: "a value with a length of at most 128",
    }),
  ),
  senderId: NonEmptyString,
  timestamp: DateTimeString,
  type: Schema.Literals(["NORMAL", "NOTIFICATION", "NPC", "PARTY_GATHERING"]),
  characterData: ChatCharacter,
  npc: Schema.optionalKey(ChatNpc),
  partyGathering: Schema.optionalKey(PartyGathering),
  replyTo: Schema.optionalKey(ChatReply),
  canEdit: Schema.Boolean,
  canDelete: Schema.Boolean,
}).annotate({ identifier: "ChatMessageResponseDto_Output" });

export type SendChatMessageRequest = typeof SendChatMessageRequest.Type;

export const SendChatMessageRequest = Schema.Struct({
  message: Schema.String.check(
    Schema.isMaxLength(128).annotate({
      expected: "a value with a length of at most 128",
    }),
  ),
  type: Schema.Literals(["NORMAL", "NOTIFICATION", "NPC", "PARTY_GATHERING"]),
  characterData: ChatCharacter,
  npc: Schema.optionalKey(ChatNpc),
  partyGathering: Schema.optionalKey(PartyGathering),
  replyTo: Schema.optionalKey(ChatReply),
}).annotate({ identifier: "SendMessageDto" });

export type ChatMessageActionResponse = typeof ChatMessageActionResponse.Type;

export const ChatMessageActionResponse = Schema.Struct({
  success: Schema.Boolean,
}).annotate({ identifier: "ChatMessageActionResponseDto_Output" });

export type UpdateChatMessageRequest = typeof UpdateChatMessageRequest.Type;

export const UpdateChatMessageRequest = Schema.Struct({
  message: NonEmptyString.check(
    Schema.isMaxLength(128).annotate({
      expected: "a value with a length of at most 128",
    }),
  ),
}).annotate({ identifier: "UpdateMessageDto" });

export type ChatOrganizationPath = typeof ChatOrganizationPath.Type;

export const ChatOrganizationPath = Schema.Struct({
  guildId: JsonValue,
});

export type ChatMessagesResponse = typeof ChatMessagesResponse.Type;

export const ChatMessagesResponse = Schema.Array(ChatMessageResponse);

export type ChatMessagePath = typeof ChatMessagePath.Type;

export const ChatMessagePath = Schema.Struct({
  messageId: Schema.String.annotate({ examples: ["msg_123"] }),
  guildId: JsonValue,
});
