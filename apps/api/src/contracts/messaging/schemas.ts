import { GameCharacter } from "../game-character.schema.js";
import { HeroTrackerEntranceSecondsLeft } from "#src/contracts/timers/schemas";
/** Shared input and output schemas for the messaging feature. */
import * as Schema from "effect/Schema";
import {
  DateTimeString,
  NonEmptyString,
  FiniteNumber,
} from "@lootlog/schema/http-scalars";

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
      isHeroFromEvent: Schema.optionalKey(
        Schema.Boolean.annotate({
          description:
            "Margonem template flag (`isHeroFromEvent`) of a hero spawned by an event; omitted when the client did not observe it.",
        }),
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
  world: NonEmptyString.check(
    Schema.isMaxLength(50).annotate({
      expected: "a value with a length of at most 50",
    }),
  ),
  isGatheringParty: Schema.optionalKey(Schema.Boolean),
  character: Schema.optionalKey(GameCharacter),
  heroTracker: Schema.optionalKey(
    Schema.Union([
      Schema.Struct({ state: Schema.Literal("unclaimed") }),
      Schema.Struct({
        state: Schema.Literal("open"),
        entranceSecondsLeft: HeroTrackerEntranceSecondsLeft,
      }),
      Schema.Struct({
        state: Schema.Literal("open"),
        entranceClosesAt: DateTimeString,
      }),
    ]).annotate({
      description:
        "State of a Hero Tracker NPC: nobody has claimed it yet, or its colossus entrance is open for `entranceSecondsLeft` more seconds, from its in-game countdown. Recipients receive `entranceClosesAt` on the server clock. Deprecated: an open entrance sent as `entranceClosesAt`, on the reporter's clock.",
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

export type SentNotificationResponse = typeof SentNotificationResponse.Type;

export const SentNotificationResponse = Schema.Struct({
  notificationId: NonEmptyString,
  guildIds: Schema.Array(NonEmptyString),
}).annotate({ identifier: "NotificationResponseDto_Output" });

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
  character: GameCharacter,
}).annotate({ identifier: "CreateVolunteerDto" });

export type NotificationPath = typeof NotificationPath.Type;

export const NotificationPath = Schema.Struct({
  notificationId: Schema.String,
});
