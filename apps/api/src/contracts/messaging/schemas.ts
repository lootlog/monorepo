/** Shared input and output schemas for the messaging feature. */
import * as Schema from "effect/Schema";
import { NonEmptyString, FiniteNumber } from "#src/contracts/scalars";

const NotificationCharacter = Schema.Struct({
  lvl: FiniteNumber,
  nick: NonEmptyString.check(
    Schema.isMaxLength(255).annotate({
      expected: "a value with a length of at most 255",
    }),
  ),
  accountId: NonEmptyString.check(
    Schema.isMaxLength(255).annotate({
      expected: "a value with a length of at most 255",
    }),
  ),
  characterId: NonEmptyString.check(
    Schema.isMaxLength(255).annotate({
      expected: "a value with a length of at most 255",
    }),
  ),
  prof: NonEmptyString.check(
    Schema.isMaxLength(100).annotate({
      expected: "a value with a length of at most 100",
    }),
  ),
  icon: NonEmptyString.check(
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
});

export type SendNotificationRequest = typeof SendNotificationRequest.Type;

export const SendNotificationRequest = Schema.Struct({
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
      name: NonEmptyString,
      location: NonEmptyString,
      lvl: FiniteNumber,
      prof: Schema.optionalKey(Schema.String),
      wt: FiniteNumber,
      hpp: Schema.optionalKey(FiniteNumber),
      x: Schema.optionalKey(FiniteNumber),
      y: Schema.optionalKey(FiniteNumber),
      icon: NonEmptyString,
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
  world: NonEmptyString.check(
    Schema.isMaxLength(50).annotate({
      expected: "a value with a length of at most 50",
    }),
  ),
  isGatheringParty: Schema.optionalKey(Schema.Boolean),
  character: Schema.optionalKey(NotificationCharacter),
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

export type SentNotificationResponse = typeof SentNotificationResponse.Type;

export const SentNotificationResponse = Schema.Struct({
  notificationId: NonEmptyString,
  guildIds: Schema.Array(NonEmptyString),
}).annotate({ identifier: "NotificationResponseDto_Output" });

export type NotificationRateLimitResponse =
  typeof NotificationRateLimitResponse.Type;

export const NotificationRateLimitResponse = Schema.Struct({
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

export type VolunteerForPartyRequest = typeof VolunteerForPartyRequest.Type;

export const VolunteerForPartyRequest = Schema.Struct({
  world: NonEmptyString.check(
    Schema.isMaxLength(50).annotate({
      expected: "a value with a length of at most 50",
    }),
  ),
  targetDiscordId: NonEmptyString.check(
    Schema.isMaxLength(20).annotate({
      expected: "a value with a length of at most 20",
    }),
  ),
  character: NotificationCharacter,
}).annotate({ identifier: "CreateVolunteerDto" });

export type NotificationPath = typeof NotificationPath.Type;

export const NotificationPath = Schema.Struct({
  notificationId: Schema.String,
});
