/** Transport schemas owned by the chat HTTP module. */
import * as Schema from "effect/Schema";

export type ChatMessageResponseDto_Output = {
  readonly id: string;
  readonly guildId: string;
  readonly message: string;
  readonly senderId: string;
  readonly timestamp: string;
  readonly type: "NORMAL" | "NOTIFICATION" | "NPC" | "PARTY_GATHERING";
  readonly characterData: {
    readonly nick: string;
    readonly id: number;
    readonly acc: number;
    readonly lvl: number;
    readonly prof: string;
    readonly icon: string;
  };
  readonly npc?: {
    readonly id: number;
    readonly name: string;
    readonly location: string;
    readonly lvl: number;
    readonly prof: string;
    readonly wt: number;
    readonly hpp?: number;
    readonly icon: string;
    readonly type: number;
    readonly x?: number;
    readonly y?: number;
  };
  readonly partyGathering?: {
    readonly notificationId: string;
    readonly discordId: string;
    readonly description?: string;
    readonly minLvl?: number;
    readonly maxLvl?: number;
    readonly world: string;
  };
  readonly replyTo?: {
    readonly messageId: string;
    readonly senderNick: string;
    readonly message: string;
    readonly type: "NORMAL" | "NOTIFICATION";
  };
  readonly canEdit: boolean;
  readonly canDelete: boolean;
};

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
  timestamp: Schema.String.annotate({ format: "date-time" }).check(
    Schema.isPattern(
      new RegExp(
        "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      ),
    ).annotate({
      expected:
        "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
    }),
  ),
  type: Schema.Literals(["NORMAL", "NOTIFICATION", "NPC", "PARTY_GATHERING"]),
  characterData: Schema.Struct({
    nick: Schema.String.check(
      Schema.isMinLength(1).annotate({
        expected: "a value with a length of at least 1",
      }),
    ),
    id: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    acc: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    lvl: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
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
      id: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
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
      lvl: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      prof: Schema.String.check(
        Schema.isMinLength(1).annotate({
          expected: "a value with a length of at least 1",
        }),
      ),
      wt: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      hpp: Schema.optionalKey(
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      ),
      icon: Schema.String.check(
        Schema.isMinLength(1).annotate({
          expected: "a value with a length of at least 1",
        }),
      ),
      type: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      x: Schema.optionalKey(
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      ),
      y: Schema.optionalKey(
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      ),
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
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        )
          .check(
            Schema.isGreaterThanOrEqualTo(1).annotate({
              expected: "a value greater than or equal to 1",
            }),
          )
          .check(
            Schema.isLessThanOrEqualTo(500).annotate({
              expected: "a value less than or equal to 500",
            }),
          ),
      ),
      maxLvl: Schema.optionalKey(
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        )
          .check(
            Schema.isGreaterThanOrEqualTo(1).annotate({
              expected: "a value greater than or equal to 1",
            }),
          )
          .check(
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

export type SendMessageDto = {
  readonly message: string;
  readonly type: "NORMAL" | "NOTIFICATION" | "NPC" | "PARTY_GATHERING";
  readonly characterData: {
    readonly nick: string;
    readonly id: number;
    readonly acc: number;
    readonly lvl: number;
    readonly prof: string;
    readonly icon: string;
  };
  readonly npc?: {
    readonly id: number;
    readonly name: string;
    readonly location: string;
    readonly lvl: number;
    readonly prof: string;
    readonly wt: number;
    readonly hpp?: number;
    readonly icon: string;
    readonly type: number;
    readonly x?: number;
    readonly y?: number;
  };
  readonly partyGathering?: {
    readonly notificationId: string;
    readonly discordId: string;
    readonly description?: string;
    readonly minLvl?: number;
    readonly maxLvl?: number;
    readonly world: string;
  };
  readonly replyTo?: {
    readonly messageId: string;
    readonly senderNick: string;
    readonly message: string;
    readonly type: "NORMAL" | "NOTIFICATION";
  };
};

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
    id: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    acc: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    lvl: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
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
      id: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
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
      lvl: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      prof: Schema.String.check(
        Schema.isMinLength(1).annotate({
          expected: "a value with a length of at least 1",
        }),
      ),
      wt: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      hpp: Schema.optionalKey(
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      ),
      icon: Schema.String.check(
        Schema.isMinLength(1).annotate({
          expected: "a value with a length of at least 1",
        }),
      ),
      type: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      x: Schema.optionalKey(
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      ),
      y: Schema.optionalKey(
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      ),
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
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        )
          .check(
            Schema.isGreaterThanOrEqualTo(1).annotate({
              expected: "a value greater than or equal to 1",
            }),
          )
          .check(
            Schema.isLessThanOrEqualTo(500).annotate({
              expected: "a value less than or equal to 500",
            }),
          ),
      ),
      maxLvl: Schema.optionalKey(
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        )
          .check(
            Schema.isGreaterThanOrEqualTo(1).annotate({
              expected: "a value greater than or equal to 1",
            }),
          )
          .check(
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

export type ChatMessageActionResponseDto_Output = { readonly success: boolean };

export const ChatMessageActionResponseDto_Output = Schema.Struct({
  success: Schema.Boolean,
}).annotate({ identifier: "ChatMessageActionResponseDto_Output" });

export type UpdateMessageDto = { readonly message: string };

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

export type ChatControllerGetChatMessagesPathParams = {
  readonly guildId: Schema.Json;
};

export const ChatControllerGetChatMessagesPathParams = Schema.Struct({
  guildId: Schema.Json.annotate({ expected: "JSON value" }),
});

export type ChatControllerGetChatMessages200 =
  ReadonlyArray<ChatMessageResponseDto_Output>;

export const ChatControllerGetChatMessages200 = Schema.Array(
  ChatMessageResponseDto_Output,
);

export type ChatControllerSendChatMessagePathParams = {
  readonly guildId: Schema.Json;
};

export const ChatControllerSendChatMessagePathParams = Schema.Struct({
  guildId: Schema.Json.annotate({ expected: "JSON value" }),
});

export type ChatControllerSendChatMessageRequestJson = SendMessageDto;

export const ChatControllerSendChatMessageRequestJson = SendMessageDto;

export type ChatControllerSendChatMessage201 = ChatMessageResponseDto_Output;

export const ChatControllerSendChatMessage201 = ChatMessageResponseDto_Output;

export type ChatControllerClearChatMessagesPathParams = {
  readonly guildId: Schema.Json;
};

export const ChatControllerClearChatMessagesPathParams = Schema.Struct({
  guildId: Schema.Json.annotate({ expected: "JSON value" }),
});

export type ChatControllerClearChatMessages200 =
  ChatMessageActionResponseDto_Output;

export const ChatControllerClearChatMessages200 =
  ChatMessageActionResponseDto_Output;

export type ChatControllerDeleteChatMessagePathParams = {
  readonly messageId: string;
  readonly guildId: Schema.Json;
};

export const ChatControllerDeleteChatMessagePathParams = Schema.Struct({
  messageId: Schema.String.annotate({ examples: ["msg_123"] }),
  guildId: Schema.Json.annotate({ expected: "JSON value" }),
});

export type ChatControllerDeleteChatMessage200 =
  ChatMessageActionResponseDto_Output;

export const ChatControllerDeleteChatMessage200 =
  ChatMessageActionResponseDto_Output;

export type ChatControllerUpdateChatMessagePathParams = {
  readonly messageId: string;
  readonly guildId: Schema.Json;
};

export const ChatControllerUpdateChatMessagePathParams = Schema.Struct({
  messageId: Schema.String.annotate({ examples: ["msg_123"] }),
  guildId: Schema.Json.annotate({ expected: "JSON value" }),
});

export type ChatControllerUpdateChatMessageRequestJson = UpdateMessageDto;

export const ChatControllerUpdateChatMessageRequestJson = UpdateMessageDto;

export type ChatControllerUpdateChatMessage200 =
  ChatMessageActionResponseDto_Output;

export const ChatControllerUpdateChatMessage200 =
  ChatMessageActionResponseDto_Output;
