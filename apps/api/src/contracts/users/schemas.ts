/** Shared input and output schemas for the users feature. */
import * as Schema from "effect/Schema";
import {
  FiniteNumber,
  NonEmptyString,
  SafeInteger,
  PositiveSafeInteger,
} from "@lootlog/schema/http-scalars";
import { ChatNpcLayoutSchema } from "@lootlog/schema/chat-appearance";
import { ThemePreferenceSchema } from "@lootlog/schema/custom-theme";
import { organizationSummaryFields } from "#src/contracts/shared";

const MutedPlayer = Schema.Struct({
  discordId: NonEmptyString,
  displayName: Schema.String,
});

const MutedNpc = Schema.Struct({
  npcKey: NonEmptyString,
  npcId: SafeInteger,
  name: NonEmptyString,
  npcType: Schema.Literals([
    "ELITE2",
    "HERO",
    "EVENT_HERO",
    "COLOSSUS",
    "TITAN",
    "HERO_TRACKER",
  ]),
  lvl: PositiveSafeInteger,
  prof: Schema.Union([Schema.String, Schema.Null]),
  icon: Schema.Union([Schema.String, Schema.Null]),
});

export type UserPreferencesResponse = typeof UserPreferencesResponse.Type;

export const UserPreferencesResponse = Schema.Struct({
  userId: Schema.String,
  guildsOrder: Schema.Array(Schema.String),
  hiddenGuildIds: Schema.Array(Schema.String),
  theme: Schema.String,
  chatAppearance: Schema.Struct({
    npcLayout: ChatNpcLayoutSchema,
    fontScalePercent: FiniteNumber.check(
      Schema.isGreaterThanOrEqualTo(70).annotate({
        expected: "a value greater than or equal to 70",
      }),
    ).check(
      Schema.isLessThanOrEqualTo(150).annotate({
        expected: "a value less than or equal to 150",
      }),
    ),
    messageGapPx: FiniteNumber.check(
      Schema.isGreaterThanOrEqualTo(0).annotate({
        expected: "a value greater than or equal to 0",
      }),
    ).check(
      Schema.isLessThanOrEqualTo(16).annotate({
        expected: "a value less than or equal to 16",
      }),
    ),
    showTimestamp: Schema.Boolean,
    showGuildLabel: Schema.Boolean,
    showNpcAvatar: Schema.Boolean,
    showNpcLevel: Schema.Boolean,
    showNpcLocationAndCoordinates: Schema.Boolean,
  }),
  mutes: Schema.Struct({
    players: Schema.Array(MutedPlayer),
    npcs: Schema.Array(MutedNpc),
  }),
}).annotate({ identifier: "UserPreferencesResponseDto_Output" });

export type UpdateUserPreferencesRequest =
  typeof UpdateUserPreferencesRequest.Type;

export const UpdateUserPreferencesRequest = Schema.Struct({
  guildsOrder: Schema.optionalKey(
    Schema.Array(Schema.String).check(
      Schema.isMinLength(1).annotate({
        expected: "a value with a length of at least 1",
      }),
    ),
  ),
  hiddenGuildIds: Schema.optionalKey(Schema.Array(NonEmptyString)),
  theme: Schema.optionalKey(ThemePreferenceSchema),
  chatAppearance: Schema.optionalKey(
    Schema.Struct({
      npcLayout: Schema.optionalKey(ChatNpcLayoutSchema),
      fontScalePercent: Schema.optionalKey(FiniteNumber),
      messageGapPx: Schema.optionalKey(FiniteNumber),
      showTimestamp: Schema.optionalKey(Schema.Boolean),
      showGuildLabel: Schema.optionalKey(Schema.Boolean),
      showNpcAvatar: Schema.optionalKey(Schema.Boolean),
      showNpcLevel: Schema.optionalKey(Schema.Boolean),
      showNpcLocationAndCoordinates: Schema.optionalKey(Schema.Boolean),
    }),
  ),
  mutes: Schema.optionalKey(
    Schema.Struct({
      players: Schema.optionalKey(Schema.Array(MutedPlayer)),
      npcs: Schema.optionalKey(Schema.Array(MutedNpc)),
    }),
  ),
}).annotate({ identifier: "UpdateUserPreferencesDto" });

type CurrentOrganizationResponse = typeof CurrentOrganizationResponse.Type;

const CurrentOrganizationResponse = Schema.Struct({
  ...organizationSummaryFields,
  hasLootlogAccess: Schema.Boolean,
  isAccessDataStale: Schema.Boolean,
}).annotate({ identifier: "UserCurrentGuildResponseDto_Output" });

export type CurrentOrganizationsResponse =
  typeof CurrentOrganizationsResponse.Type;

export const CurrentOrganizationsResponse = Schema.Array(
  CurrentOrganizationResponse,
);

export const AccountDeletionAccepted = Schema.Struct({
  status: Schema.Literal("ACCEPTED"),
}).annotate({ identifier: "AccountDeletionAcceptedResponseDto_Output" });
