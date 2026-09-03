/** Transport schemas owned by the messaging HTTP module. */
import * as Schema from "effect/Schema";

export type CreateNotificationDto = {
  readonly message?: string;
  readonly npc?: {
    readonly id: number;
    readonly name: string;
    readonly location: string;
    readonly lvl: number;
    readonly prof?: string;
    readonly wt: number;
    readonly hpp?: number;
    readonly x?: number;
    readonly y?: number;
    readonly icon: string;
    readonly type: number;
  };
  readonly guildIds: ReadonlyArray<string>;
  readonly world: string;
  readonly isGatheringParty?: boolean;
  readonly character?: {
    readonly lvl: number;
    readonly nick: string;
    readonly accountId: string;
    readonly characterId: string;
    readonly prof: string;
    readonly icon: string;
    readonly clan?: { readonly id?: number; readonly name?: string };
  };
};

export const CreateNotificationDto = Schema.Struct({
  message: Schema.optionalKey(
    Schema.String.check(
      Schema.isMaxLength(500).annotate({
        expected: "a value with a length of at most 500",
      }),
    ),
  ),
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
      prof: Schema.optionalKey(Schema.String),
      wt: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      hpp: Schema.optionalKey(
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
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
      icon: Schema.String.check(
        Schema.isMinLength(1).annotate({
          expected: "a value with a length of at least 1",
        }),
      ),
      type: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
    }),
  ),
  guildIds: Schema.Array(
    Schema.String.check(
      Schema.isMaxLength(50).annotate({
        expected: "a value with a length of at most 50",
      }),
    ),
  )
    .check(
      Schema.isMinLength(1).annotate({
        expected: "a value with a length of at least 1",
      }),
    )
    .check(
      Schema.isMaxLength(10).annotate({
        expected: "a value with a length of at most 10",
      }),
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
  isGatheringParty: Schema.optionalKey(Schema.Boolean),
  character: Schema.optionalKey(
    Schema.Struct({
      lvl: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      nick: Schema.String.check(
        Schema.isMinLength(1).annotate({
          expected: "a value with a length of at least 1",
        }),
      ).check(
        Schema.isMaxLength(255).annotate({
          expected: "a value with a length of at most 255",
        }),
      ),
      accountId: Schema.String.check(
        Schema.isMinLength(1).annotate({
          expected: "a value with a length of at least 1",
        }),
      ).check(
        Schema.isMaxLength(255).annotate({
          expected: "a value with a length of at most 255",
        }),
      ),
      characterId: Schema.String.check(
        Schema.isMinLength(1).annotate({
          expected: "a value with a length of at least 1",
        }),
      ).check(
        Schema.isMaxLength(255).annotate({
          expected: "a value with a length of at most 255",
        }),
      ),
      prof: Schema.String.check(
        Schema.isMinLength(1).annotate({
          expected: "a value with a length of at least 1",
        }),
      ).check(
        Schema.isMaxLength(100).annotate({
          expected: "a value with a length of at most 100",
        }),
      ),
      icon: Schema.String.check(
        Schema.isMinLength(1).annotate({
          expected: "a value with a length of at least 1",
        }),
      ).check(
        Schema.isMaxLength(2048).annotate({
          expected: "a value with a length of at most 2048",
        }),
      ),
      clan: Schema.optionalKey(
        Schema.Struct({
          id: Schema.optionalKey(
            Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ),
          ),
          name: Schema.optionalKey(
            Schema.String.check(
              Schema.isMaxLength(255).annotate({
                expected: "a value with a length of at most 255",
              }),
            ),
          ),
        }),
      ),
    }),
  ),
})
  .check(
    Schema.makeFilter((notification) => {
      if (!notification.isGatheringParty) return undefined;

      const issues: Array<Schema.FilterIssue> = [];
      if (notification.npc === undefined) {
        issues.push({
          path: ["npc"],
          issue: "Party gathering notifications require an NPC",
        });
      }
      if (notification.character === undefined) {
        issues.push({
          path: ["character"],
          issue: "Party gathering notifications require a character",
        });
      }
      return issues;
    }),
  )
  .annotate({ identifier: "CreateNotificationDto" });

export type NotificationResponseDto_Output = {
  readonly notificationId: string;
  readonly guildIds: ReadonlyArray<string>;
};

export const NotificationResponseDto_Output = Schema.Struct({
  notificationId: Schema.String.check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ),
  guildIds: Schema.Array(
    Schema.String.check(
      Schema.isMinLength(1).annotate({
        expected: "a value with a length of at least 1",
      }),
    ),
  ),
}).annotate({ identifier: "NotificationResponseDto_Output" });

export type NotificationRateLimitResponseDto = {
  readonly message: "NOTIFICATION_RATE_LIMITED";
  readonly retryAfterMs: number;
};

export const NotificationRateLimitResponseDto = Schema.Struct({
  message: Schema.Literal("NOTIFICATION_RATE_LIMITED"),
  retryAfterMs: Schema.Number.check(
    Schema.isInt().annotate({ expected: "an integer" }),
  )
    .check(
      Schema.isLessThanOrEqualTo(9007199254740991).annotate({
        expected: "a value less than or equal to 9007199254740991",
      }),
    )
    .check(
      Schema.isGreaterThan(0).annotate({ expected: "a value greater than 0" }),
    ),
}).annotate({ identifier: "NotificationRateLimitResponseDto" });

export type CreateVolunteerDto = {
  readonly world: string;
  readonly targetDiscordId: string;
  readonly character: {
    readonly lvl: number;
    readonly nick: string;
    readonly accountId: string;
    readonly characterId: string;
    readonly prof: string;
    readonly icon: string;
    readonly clan?: { readonly id?: number; readonly name?: string };
  };
};

export const CreateVolunteerDto = Schema.Struct({
  world: Schema.String.check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ).check(
    Schema.isMaxLength(50).annotate({
      expected: "a value with a length of at most 50",
    }),
  ),
  targetDiscordId: Schema.String.check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ).check(
    Schema.isMaxLength(20).annotate({
      expected: "a value with a length of at most 20",
    }),
  ),
  character: Schema.Struct({
    lvl: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    nick: Schema.String.check(
      Schema.isMinLength(1).annotate({
        expected: "a value with a length of at least 1",
      }),
    ).check(
      Schema.isMaxLength(255).annotate({
        expected: "a value with a length of at most 255",
      }),
    ),
    accountId: Schema.String.check(
      Schema.isMinLength(1).annotate({
        expected: "a value with a length of at least 1",
      }),
    ).check(
      Schema.isMaxLength(255).annotate({
        expected: "a value with a length of at most 255",
      }),
    ),
    characterId: Schema.String.check(
      Schema.isMinLength(1).annotate({
        expected: "a value with a length of at least 1",
      }),
    ).check(
      Schema.isMaxLength(255).annotate({
        expected: "a value with a length of at most 255",
      }),
    ),
    prof: Schema.String.check(
      Schema.isMinLength(1).annotate({
        expected: "a value with a length of at least 1",
      }),
    ).check(
      Schema.isMaxLength(100).annotate({
        expected: "a value with a length of at most 100",
      }),
    ),
    icon: Schema.String.check(
      Schema.isMinLength(1).annotate({
        expected: "a value with a length of at least 1",
      }),
    ).check(
      Schema.isMaxLength(2048).annotate({
        expected: "a value with a length of at most 2048",
      }),
    ),
    clan: Schema.optionalKey(
      Schema.Struct({
        id: Schema.optionalKey(
          Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
        ),
        name: Schema.optionalKey(
          Schema.String.check(
            Schema.isMaxLength(255).annotate({
              expected: "a value with a length of at most 255",
            }),
          ),
        ),
      }),
    ),
  }),
}).annotate({ identifier: "CreateVolunteerDto" });

export type MessagingControllerSendNotificationRequestJson =
  CreateNotificationDto;

export const MessagingControllerSendNotificationRequestJson =
  CreateNotificationDto;

export type MessagingControllerSendNotification201 =
  NotificationResponseDto_Output;

export const MessagingControllerSendNotification201 =
  NotificationResponseDto_Output;

export type MessagingControllerSendNotification429 =
  NotificationRateLimitResponseDto;

export const MessagingControllerSendNotification429 =
  NotificationRateLimitResponseDto;

export type MessagingControllerVolunteerPathParams = {
  readonly notificationId: string;
};

export const MessagingControllerVolunteerPathParams = Schema.Struct({
  notificationId: Schema.String,
});

export type MessagingControllerVolunteerRequestJson = CreateVolunteerDto;

export const MessagingControllerVolunteerRequestJson = CreateVolunteerDto;
