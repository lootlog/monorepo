/** Transport schemas owned by the messaging HTTP module. */
import * as Schema from "effect/Schema";
import { FiniteNumber } from "../scalars.js";

export type CreateNotificationDto = typeof CreateNotificationDto.Type;

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
      prof: Schema.optionalKey(Schema.String),
      wt: FiniteNumber,
      hpp: Schema.optionalKey(FiniteNumber),
      x: Schema.optionalKey(FiniteNumber),
      y: Schema.optionalKey(FiniteNumber),
      icon: Schema.String.check(
        Schema.isMinLength(1).annotate({
          expected: "a value with a length of at least 1",
        }),
      ),
      type: FiniteNumber,
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
      lvl: FiniteNumber,
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
          id: Schema.optionalKey(FiniteNumber),
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

export type NotificationResponseDto_Output =
  typeof NotificationResponseDto_Output.Type;

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

export type NotificationRateLimitResponseDto =
  typeof NotificationRateLimitResponseDto.Type;

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

export type CreateVolunteerDto = typeof CreateVolunteerDto.Type;

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
    lvl: FiniteNumber,
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
        id: Schema.optionalKey(FiniteNumber),
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
  typeof MessagingControllerSendNotificationRequestJson.Type;

export const MessagingControllerSendNotificationRequestJson =
  CreateNotificationDto;

export type MessagingControllerSendNotification201 =
  typeof MessagingControllerSendNotification201.Type;

export const MessagingControllerSendNotification201 =
  NotificationResponseDto_Output;

export type MessagingControllerSendNotification429 =
  typeof MessagingControllerSendNotification429.Type;

export const MessagingControllerSendNotification429 =
  NotificationRateLimitResponseDto;

export type MessagingControllerVolunteerPathParams =
  typeof MessagingControllerVolunteerPathParams.Type;

export const MessagingControllerVolunteerPathParams = Schema.Struct({
  notificationId: Schema.String,
});

export type MessagingControllerVolunteerRequestJson =
  typeof MessagingControllerVolunteerRequestJson.Type;

export const MessagingControllerVolunteerRequestJson = CreateVolunteerDto;
