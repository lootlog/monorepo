/** Transport schemas owned by the chat HTTP module. */
import * as Schema from "effect/Schema";
import { DateTimeString, FiniteNumber } from "../scalars.js";

export type ChatMessageResponseDto_Output =
  typeof ChatMessageResponseDto_Output.Type;

export const ChatMessageResponseDto_Output = Schema.Struct({
  id: Schema.String.check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ),
  guildId: Schema.String.check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ),
  message: Schema.String.check(
    Schema.isMaxLength(128).annotate({
      expected: "a value with a length of at most 128",
    }),
  ),
  senderId: Schema.String.check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ),
  timestamp: DateTimeString,
  type: Schema.Literals(["NORMAL", "NOTIFICATION", "NPC", "PARTY_GATHERING"]),
  characterData: Schema.Struct({
    nick: Schema.String.check(
      Schema.isMinLength(1).annotate({
        expected: "a value with a length of at least 1",
      }),
    ),
    id: FiniteNumber,
    acc: FiniteNumber,
    lvl: FiniteNumber,
    prof: Schema.String.check(
      Schema.isMinLength(1).annotate({
        expected: "a value with a length of at least 1",
      }),
    ),
    icon: Schema.String.check(
      Schema.isMinLength(1).annotate({
        expected: "a value with a length of at least 1",
      }),
    ),
  }),
  npc: Schema.optionalKey(
    Schema.Struct({
      id: FiniteNumber,
      name: Schema.String.check(
        Schema.isMinLength(1).annotate({
          expected: "a value with a length of at least 1",
        }),
      ),
      location: Schema.String.check(
        Schema.isMinLength(1).annotate({
          expected: "a value with a length of at least 1",
        }),
      ),
      lvl: FiniteNumber,
      prof: Schema.String.check(
        Schema.isMinLength(1).annotate({
          expected: "a value with a length of at least 1",
        }),
      ),
      wt: FiniteNumber,
      hpp: Schema.optionalKey(FiniteNumber),
      icon: Schema.String.check(
        Schema.isMinLength(1).annotate({
          expected: "a value with a length of at least 1",
        }),
      ),
      type: FiniteNumber,
      x: Schema.optionalKey(FiniteNumber),
      y: Schema.optionalKey(FiniteNumber),
    }),
  ),
  partyGathering: Schema.optionalKey(
    Schema.Struct({
      notificationId: Schema.String.check(
        Schema.isMinLength(1).annotate({
          expected: "a value with a length of at least 1",
        }),
      ),
      discordId: Schema.String.check(
        Schema.isMinLength(1).annotate({
          expected: "a value with a length of at least 1",
        }),
      ),
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
      world: Schema.String.check(
        Schema.isMinLength(1).annotate({
          expected: "a value with a length of at least 1",
        }),
      ).check(
        Schema.isMaxLength(50).annotate({
          expected: "a value with a length of at most 50",
        }),
      ),
    }),
  ),
  replyTo: Schema.optionalKey(
    Schema.Struct({
      messageId: Schema.String.check(
        Schema.isMinLength(1).annotate({
          expected: "a value with a length of at least 1",
        }),
      ),
      senderNick: Schema.String.check(
        Schema.isMinLength(1).annotate({
          expected: "a value with a length of at least 1",
        }),
      ),
      message: Schema.String.check(
        Schema.isMaxLength(128).annotate({
          expected: "a value with a length of at most 128",
        }),
      ),
      type: Schema.Literals(["NORMAL", "NOTIFICATION"]),
    }),
  ),
  canEdit: Schema.Boolean,
  canDelete: Schema.Boolean,
}).annotate({ identifier: "ChatMessageResponseDto_Output" });

export type SendMessageDto = typeof SendMessageDto.Type;

export const SendMessageDto = Schema.Struct({
  message: Schema.String.check(
    Schema.isMaxLength(128).annotate({
      expected: "a value with a length of at most 128",
    }),
  ),
  type: Schema.Literals(["NORMAL", "NOTIFICATION", "NPC", "PARTY_GATHERING"]),
  characterData: Schema.Struct({
    nick: Schema.String.check(
      Schema.isMinLength(1).annotate({
        expected: "a value with a length of at least 1",
      }),
    ),
    id: FiniteNumber,
    acc: FiniteNumber,
    lvl: FiniteNumber,
    prof: Schema.String.check(
      Schema.isMinLength(1).annotate({
        expected: "a value with a length of at least 1",
      }),
    ),
    icon: Schema.String.check(
      Schema.isMinLength(1).annotate({
        expected: "a value with a length of at least 1",
      }),
    ),
  }),
  npc: Schema.optionalKey(
    Schema.Struct({
      id: FiniteNumber,
      name: Schema.String.check(
        Schema.isMinLength(1).annotate({
          expected: "a value with a length of at least 1",
        }),
      ),
      location: Schema.String.check(
        Schema.isMinLength(1).annotate({
          expected: "a value with a length of at least 1",
        }),
      ),
      lvl: FiniteNumber,
      prof: Schema.String.check(
        Schema.isMinLength(1).annotate({
          expected: "a value with a length of at least 1",
        }),
      ),
      wt: FiniteNumber,
      hpp: Schema.optionalKey(FiniteNumber),
      icon: Schema.String.check(
        Schema.isMinLength(1).annotate({
          expected: "a value with a length of at least 1",
        }),
      ),
      type: FiniteNumber,
      x: Schema.optionalKey(FiniteNumber),
      y: Schema.optionalKey(FiniteNumber),
    }),
  ),
  partyGathering: Schema.optionalKey(
    Schema.Struct({
      notificationId: Schema.String.check(
        Schema.isMinLength(1).annotate({
          expected: "a value with a length of at least 1",
        }),
      ),
      discordId: Schema.String.check(
        Schema.isMinLength(1).annotate({
          expected: "a value with a length of at least 1",
        }),
      ),
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
      world: Schema.String.check(
        Schema.isMinLength(1).annotate({
          expected: "a value with a length of at least 1",
        }),
      ).check(
        Schema.isMaxLength(50).annotate({
          expected: "a value with a length of at most 50",
        }),
      ),
    }),
  ),
  replyTo: Schema.optionalKey(
    Schema.Struct({
      messageId: Schema.String.check(
        Schema.isMinLength(1).annotate({
          expected: "a value with a length of at least 1",
        }),
      ),
      senderNick: Schema.String.check(
        Schema.isMinLength(1).annotate({
          expected: "a value with a length of at least 1",
        }),
      ),
      message: Schema.String.check(
        Schema.isMaxLength(128).annotate({
          expected: "a value with a length of at most 128",
        }),
      ),
      type: Schema.Literals(["NORMAL", "NOTIFICATION"]),
    }),
  ),
}).annotate({ identifier: "SendMessageDto" });

export type ChatMessageActionResponseDto_Output =
  typeof ChatMessageActionResponseDto_Output.Type;

export const ChatMessageActionResponseDto_Output = Schema.Struct({
  success: Schema.Boolean,
}).annotate({ identifier: "ChatMessageActionResponseDto_Output" });

export type UpdateMessageDto = typeof UpdateMessageDto.Type;

export const UpdateMessageDto = Schema.Struct({
  message: Schema.String.check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ).check(
    Schema.isMaxLength(128).annotate({
      expected: "a value with a length of at most 128",
    }),
  ),
}).annotate({ identifier: "UpdateMessageDto" });

export type ChatControllerGetChatMessagesPathParams =
  typeof ChatControllerGetChatMessagesPathParams.Type;

export const ChatControllerGetChatMessagesPathParams = Schema.Struct({
  guildId: Schema.Json.annotate({ expected: "JSON value" }),
});

export type ChatControllerGetChatMessages200 =
  typeof ChatControllerGetChatMessages200.Type;

export const ChatControllerGetChatMessages200 = Schema.Array(
  ChatMessageResponseDto_Output,
);

export type ChatControllerSendChatMessagePathParams =
  typeof ChatControllerSendChatMessagePathParams.Type;

export const ChatControllerSendChatMessagePathParams = Schema.Struct({
  guildId: Schema.Json.annotate({ expected: "JSON value" }),
});

export type ChatControllerSendChatMessageRequestJson =
  typeof ChatControllerSendChatMessageRequestJson.Type;

export const ChatControllerSendChatMessageRequestJson = SendMessageDto;

export type ChatControllerSendChatMessage201 =
  typeof ChatControllerSendChatMessage201.Type;

export const ChatControllerSendChatMessage201 = ChatMessageResponseDto_Output;

export type ChatControllerClearChatMessagesPathParams =
  typeof ChatControllerClearChatMessagesPathParams.Type;

export const ChatControllerClearChatMessagesPathParams = Schema.Struct({
  guildId: Schema.Json.annotate({ expected: "JSON value" }),
});

export type ChatControllerClearChatMessages200 =
  typeof ChatControllerClearChatMessages200.Type;

export const ChatControllerClearChatMessages200 =
  ChatMessageActionResponseDto_Output;

export type ChatControllerDeleteChatMessagePathParams =
  typeof ChatControllerDeleteChatMessagePathParams.Type;

export const ChatControllerDeleteChatMessagePathParams = Schema.Struct({
  messageId: Schema.String.annotate({ examples: ["msg_123"] }),
  guildId: Schema.Json.annotate({ expected: "JSON value" }),
});

export type ChatControllerDeleteChatMessage200 =
  typeof ChatControllerDeleteChatMessage200.Type;

export const ChatControllerDeleteChatMessage200 =
  ChatMessageActionResponseDto_Output;

export type ChatControllerUpdateChatMessagePathParams =
  typeof ChatControllerUpdateChatMessagePathParams.Type;

export const ChatControllerUpdateChatMessagePathParams = Schema.Struct({
  messageId: Schema.String.annotate({ examples: ["msg_123"] }),
  guildId: Schema.Json.annotate({ expected: "JSON value" }),
});

export type ChatControllerUpdateChatMessageRequestJson =
  typeof ChatControllerUpdateChatMessageRequestJson.Type;

export const ChatControllerUpdateChatMessageRequestJson = UpdateMessageDto;

export type ChatControllerUpdateChatMessage200 =
  typeof ChatControllerUpdateChatMessage200.Type;

export const ChatControllerUpdateChatMessage200 =
  ChatMessageActionResponseDto_Output;
