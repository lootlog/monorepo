/** Shared input and output schemas for the party-ready-room feature. */
import * as Schema from "effect/Schema";
import { PARTY_READY_ROOM_PARTY_PRESENCE_STATES } from "@lootlog/schema/party-ready-room";
import {
  DateTimeString,
  FiniteNumber,
  NonEmptyString,
  PositiveSafeInteger,
} from "#src/contracts/scalars";

const ReadyRoomClan = Schema.Struct({
  id: Schema.optionalKey(FiniteNumber),
  name: Schema.optionalKey(
    Schema.String.check(
      Schema.isMaxLength(255).annotate({
        expected: "a value with a length of at most 255",
      }),
    ),
  ),
});
const ReadyRoomCharacter = Schema.Struct({
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
  clan: Schema.optionalKey(ReadyRoomClan),
});
const ReadyRoomParticipant = Schema.Struct({
  participantId: Schema.String,
  discordId: Schema.String,
  character: ReadyRoomCharacter,
  partyPresence: Schema.Literals(PARTY_READY_ROOM_PARTY_PRESENCE_STATES),
  createdAt: DateTimeString,
  updatedAt: DateTimeString,
});
const readyRoomFields = {
  schemaVersion: Schema.Literal(3),
  notificationId: Schema.String,
  organizerDiscordId: Schema.String,
  organizerCharacter: ReadyRoomCharacter,
  guildIds: Schema.Array(Schema.String),
  world: Schema.String,
  description: Schema.optionalKey(Schema.String),
  minLvl: Schema.optionalKey(FiniteNumber),
  maxLvl: Schema.optionalKey(FiniteNumber),
  status: Schema.Literal("ACTIVE"),
  revision: PositiveSafeInteger,
  createdAt: DateTimeString,
  updatedAt: DateTimeString,
  expiresAt: DateTimeString,
  viewer: Schema.Literals(["ORGANIZER", "PARTICIPANT"]),
  participants: Schema.Record(Schema.String, ReadyRoomParticipant),
  ownedParticipantIds: Schema.optionalKey(Schema.Array(Schema.String)),
};

export const PartyReadyRoomResponse = Schema.Struct(readyRoomFields).annotate({
  identifier: "PartyReadyRoomProjectionDto_Output",
});
export type PartyReadyRoomResponse = typeof PartyReadyRoomResponse.Type;

export const CreatePartyGatheringRequest = Schema.Struct({
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
  character: ReadyRoomCharacter,
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
}).annotate({ identifier: "CreatePartyGatheringDto" });
export type CreatePartyGatheringRequest =
  typeof CreatePartyGatheringRequest.Type;

export const ApplyToPartyReadyRoomRequest = Schema.Struct({
  world: NonEmptyString.check(
    Schema.isMaxLength(50).annotate({
      expected: "a value with a length of at most 50",
    }),
  ),
  character: ReadyRoomCharacter,
}).annotate({ identifier: "PartyReadyRoomApplicationDto" });
export type ApplyToPartyReadyRoomRequest =
  typeof ApplyToPartyReadyRoomRequest.Type;

export const PartyParticipantIdentity = Schema.Struct({
  participantId: NonEmptyString.check(
    Schema.isMaxLength(100).annotate({
      expected: "a value with a length of at most 100",
    }),
  ),
}).annotate({ identifier: "PartyReadyRoomParticipantIdentityDto" });
export type PartyParticipantIdentity = typeof PartyParticipantIdentity.Type;

export const PartyReadyRoomUpdateResponse = Schema.Struct({
  schemaVersion: Schema.Literal(3),
  type: Schema.Literals(["UPSERT", "REMOVE"]),
  projection: Schema.optionalKey(Schema.Struct(readyRoomFields)),
  notificationId: Schema.optionalKey(Schema.String),
  revision: Schema.optionalKey(PositiveSafeInteger),
}).annotate({ identifier: "PartyReadyRoomClientUpdateDto_Output" });
export type PartyReadyRoomUpdateResponse =
  typeof PartyReadyRoomUpdateResponse.Type;

export const PartyParticipantActionRequest = Schema.Struct({
  expectedRevision: PositiveSafeInteger,
  participantId: NonEmptyString.check(
    Schema.isMaxLength(100).annotate({
      expected: "a value with a length of at most 100",
    }),
  ),
}).annotate({ identifier: "PartyReadyRoomParticipantActionDto" });
export type PartyParticipantActionRequest =
  typeof PartyParticipantActionRequest.Type;

export const ResolvePartyInvitationsRequest = Schema.Struct({
  participantIds: Schema.Array(
    NonEmptyString.check(
      Schema.isMaxLength(100).annotate({
        expected: "a value with a length of at most 100",
      }),
    ),
  )
    .check(
      Schema.isMinLength(1).annotate({
        expected: "a value with a length of at least 1",
      }),
    )
    .check(
      Schema.isMaxLength(100).annotate({
        expected: "a value with a length of at most 100",
      }),
    ),
}).annotate({ identifier: "PartyReadyRoomResolveInvitationTargetsDto" });
export type ResolvePartyInvitationsRequest =
  typeof ResolvePartyInvitationsRequest.Type;

export const PartyInvitationTargetsResponse = Schema.Struct({
  targets: Schema.Array(
    Schema.Struct({ participantId: Schema.String, characterId: Schema.String }),
  ),
}).annotate({ identifier: "PartyReadyRoomInvitationTargetsDto_Output" });
export type PartyInvitationTargetsResponse =
  typeof PartyInvitationTargetsResponse.Type;

export const ObservePartyRequest = Schema.Struct({
  memberCharacterIds: Schema.Array(
    NonEmptyString.check(
      Schema.isMaxLength(255).annotate({
        expected: "a value with a length of at most 255",
      }),
    ),
  ).check(
    Schema.isMaxLength(20).annotate({
      expected: "a value with a length of at most 20",
    }),
  ),
  organizerAccountId: NonEmptyString.check(
    Schema.isMaxLength(255).annotate({
      expected: "a value with a length of at most 255",
    }),
  ),
  organizerCharacterId: NonEmptyString.check(
    Schema.isMaxLength(255).annotate({
      expected: "a value with a length of at most 255",
    }),
  ),
}).annotate({ identifier: "PartyReadyRoomObservationDto" });
export type ObservePartyRequest = typeof ObservePartyRequest.Type;

export const PartyRevisionRequest = Schema.Struct({
  expectedRevision: PositiveSafeInteger,
}).annotate({ identifier: "PartyReadyRoomExpectedRevisionDto" });
export type PartyRevisionRequest = typeof PartyRevisionRequest.Type;

export const PartyReadyRoomsResponse = Schema.Array(PartyReadyRoomResponse);
export type PartyReadyRoomsResponse = typeof PartyReadyRoomsResponse.Type;

export const PartyReadyRoomParams = Schema.Struct({
  notificationId: Schema.String,
});
export type PartyReadyRoomParams = typeof PartyReadyRoomParams.Type;
