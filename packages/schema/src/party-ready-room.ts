import { Schema } from "effect";
import {
  DateTimeString,
  FiniteNumber,
  NonEmptyString,
  NonNegativeSafeInteger,
  PositiveSafeInteger,
} from "./http-scalars.js";

const PARTY_READY_ROOM_STATUSES = ["ACTIVE", "CANCELLED"] as const;

export const PARTY_READY_ROOM_PARTY_PRESENCE_STATES = [
  "OUTSIDE",
  "IN_PARTY",
] as const;

export type PartyReadyRoomStatus = (typeof PARTY_READY_ROOM_STATUSES)[number];

type PartyReadyRoomPartyPresenceState =
  (typeof PARTY_READY_ROOM_PARTY_PRESENCE_STATES)[number];

interface PartyReadyRoomClan {
  id?: number;
  name?: string;
}

export interface PartyReadyRoomCharacter {
  accountId: string;
  characterId: string;
  icon: string;
  lvl: number;
  nick: string;
  prof: string;
  clan?: PartyReadyRoomClan;
}

export interface PartyReadyRoomParticipant {
  participantId: string;
  discordId: string;
  character: PartyReadyRoomCharacter;
  partyPresence: PartyReadyRoomPartyPresenceState;
  createdAt: string;
  updatedAt: string;
}

export interface PartyReadyRoomProjectionBase {
  npc?: PartyGatheringNpc;
  schemaVersion: 3;
  notificationId: string;
  organizerDiscordId: string;
  organizerCharacter: PartyReadyRoomCharacter;
  guildIds: string[];
  world: string;
  description?: string;
  minLvl?: number;
  maxLvl?: number;
  partyMemberCount?: number;
  partyState?: PartyGatheringPartyState;
  volunteers?: ReadonlyArray<PartyGatheringVolunteer>;
  status: "ACTIVE";
  revision: number;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

export type PartyReadyRoomOrganizerProjection =
  typeof PartyReadyRoomOrganizerProjectionSchema.Type;

export type PartyReadyRoomParticipantProjection =
  typeof PartyReadyRoomParticipantProjectionSchema.Type;

export type PartyReadyRoomProjection =
  typeof PartyReadyRoomProjectionSchema.Type;

export type PartyReadyRoomClientUpdate =
  typeof PartyReadyRoomClientUpdateSchema.Type;

export interface PartyReadyRoomUpdateEnvelope {
  recipientDiscordId: string;
  eligibleGuildIds: string[];
  update: PartyReadyRoomClientUpdate;
}

export interface PartyReadyRoomInvitationTarget {
  participantId: string;
  characterId: string;
}

const PartyReadyRoomClanSchema = Schema.Struct({
  id: Schema.optionalKey(Schema.Number),
  name: Schema.optionalKey(Schema.String),
});

const PartyReadyRoomCharacterSchema = Schema.Struct({
  accountId: Schema.String,
  characterId: Schema.String,
  icon: Schema.String,
  lvl: Schema.Number,
  nick: Schema.String,
  prof: Schema.String,
  clan: Schema.optionalKey(PartyReadyRoomClanSchema),
});

const PartyReadyRoomParticipantSchema = Schema.Struct({
  participantId: Schema.String,
  discordId: Schema.String,
  character: PartyReadyRoomCharacterSchema,
  partyPresence: Schema.Literals(PARTY_READY_ROOM_PARTY_PRESENCE_STATES),
  createdAt: Schema.String,
  updatedAt: Schema.String,
});

export const PartyGatheringNpcSchema = Schema.Struct({
  prof: Schema.optionalKey(Schema.String),
  icon: Schema.optionalKey(Schema.String),
  name: Schema.String,
  location: Schema.String,
  lvl: Schema.Number,
  type: Schema.String,
  x: Schema.optionalKey(Schema.Number),
  y: Schema.optionalKey(Schema.Number),
});

export type PartyGatheringNpc = typeof PartyGatheringNpcSchema.Type;

export const PartyGatheringCharacterSchema = Schema.Struct({
  characterId: NonEmptyString.check(Schema.isMaxLength(255)),
  nick: Schema.String.check(Schema.isMaxLength(255)),
  icon: Schema.String.check(Schema.isMaxLength(2048)),
  lvl: FiniteNumber,
  prof: Schema.String.check(Schema.isMaxLength(100)),
});

export type PartyGatheringCharacter = typeof PartyGatheringCharacterSchema.Type;

export const PartyGatheringPartyMemberSchema = Schema.Struct({
  characterId: PartyGatheringCharacterSchema.fields.characterId,
  nick: Schema.optionalKey(PartyGatheringCharacterSchema.fields.nick),
  icon: Schema.optionalKey(PartyGatheringCharacterSchema.fields.icon),
  lvl: Schema.optionalKey(PartyGatheringCharacterSchema.fields.lvl),
  prof: Schema.optionalKey(PartyGatheringCharacterSchema.fields.prof),
});

export type PartyGatheringPartyMember =
  typeof PartyGatheringPartyMemberSchema.Type;

export const PartyGatheringPartyStateSchema = Schema.Union([
  Schema.Struct({ status: Schema.Literal("UNKNOWN") }),
  Schema.Struct({
    status: Schema.Literal("OBSERVED"),
    observedAt: DateTimeString,
    members: Schema.Array(PartyGatheringPartyMemberSchema).check(
      Schema.isMaxLength(20),
    ),
  }),
]);

export type PartyGatheringPartyState =
  typeof PartyGatheringPartyStateSchema.Type;

// Viewers show an observed party as stale once `observedAt` is this old.
export const PARTY_OBSERVATION_FRESHNESS_MS = 2 * 60_000;

// The organizer's client re-reports an unchanged party this often so that
// viewers keep receiving a fresh `observedAt` well before it goes stale.
export const PARTY_OBSERVATION_HEARTBEAT_MS = 60_000;

// The API commits an unchanged observation only once it is at least this old.
// It stays below the heartbeat interval so every heartbeat refreshes viewers,
// while repeated reports (reconnects, remounts) do not publish a new revision.
export const PARTY_OBSERVATION_REFRESH_MS = 45_000;

export const PartyGatheringVolunteerSchema = Schema.Struct({
  ...PartyGatheringCharacterSchema.fields,
  partyPresence: Schema.Literals(PARTY_READY_ROOM_PARTY_PRESENCE_STATES),
});

export type PartyGatheringVolunteer = typeof PartyGatheringVolunteerSchema.Type;

export const PartyGatheringSummarySchema = Schema.Struct({
  notificationId: Schema.String,
  organizerName: Schema.String,
  organizerDiscordId: Schema.optionalKey(Schema.String),
  organizerLvl: Schema.optionalKey(FiniteNumber),
  organizerProf: Schema.optionalKey(Schema.String),
  applicantCount: NonNegativeSafeInteger,
  inPartyCount: NonNegativeSafeInteger,
  partyMemberCount: Schema.optionalKey(NonNegativeSafeInteger),
  revision: Schema.optionalKey(PositiveSafeInteger),
  volunteers: Schema.optionalKey(Schema.Array(PartyGatheringVolunteerSchema)),
  partyState: Schema.optionalKey(PartyGatheringPartyStateSchema),
  guildIds: Schema.Array(Schema.String),
  world: Schema.String,
  description: Schema.optionalKey(Schema.String),
  minLvl: Schema.optionalKey(FiniteNumber),
  maxLvl: Schema.optionalKey(FiniteNumber),
  npc: Schema.optionalKey(
    Schema.Struct({
      ...PartyGatheringNpcSchema.fields,
      type: Schema.optionalKey(Schema.String),
    }),
  ),
  createdAt: DateTimeString,
  expiresAt: DateTimeString,
});

export type PartyGatheringSummary = typeof PartyGatheringSummarySchema.Type;

export const PartyGatheringClientUpdateSchema = Schema.Union([
  Schema.Struct({
    type: Schema.Literal("UPSERT"),
    gathering: PartyGatheringSummarySchema,
  }),
  Schema.Struct({
    type: Schema.Literal("REMOVE"),
    notificationId: Schema.String,
    revision: PositiveSafeInteger,
  }),
]);

export type PartyGatheringClientUpdate =
  typeof PartyGatheringClientUpdateSchema.Type;

export const PartyGatheringUpdateEnvelopeSchema = Schema.Struct({
  guildId: Schema.String,
  guildIds: Schema.Array(Schema.String),
  organizerDiscordId: Schema.String,
  npc: Schema.optionalKey(PartyGatheringNpcSchema),
  world: Schema.String,
  notificationId: Schema.String,
  revision: PositiveSafeInteger,
  update: PartyGatheringClientUpdateSchema,
});

export type PartyGatheringUpdateEnvelope =
  typeof PartyGatheringUpdateEnvelopeSchema.Type;

export const decodePartyGatheringClientUpdate = Schema.decodeUnknownSync(
  PartyGatheringClientUpdateSchema,
);

export const PartyReadyRoomAggregateSchema = Schema.Struct({
  schemaVersion: Schema.Literal(3),
  npc: Schema.optionalKey(PartyGatheringNpcSchema),
  notificationId: Schema.String,
  organizerDiscordId: Schema.String,
  organizerCharacter: PartyReadyRoomCharacterSchema,
  guildIds: Schema.mutable(Schema.Array(Schema.String)),
  world: Schema.String,
  description: Schema.optionalKey(Schema.String),
  minLvl: Schema.optionalKey(Schema.Number),
  maxLvl: Schema.optionalKey(Schema.Number),
  partyMemberCount: Schema.optionalKey(NonNegativeSafeInteger),
  partyState: Schema.optionalKey(PartyGatheringPartyStateSchema),
  status: Schema.Literals(PARTY_READY_ROOM_STATUSES),
  revision: Schema.Number,
  createdAt: Schema.String,
  updatedAt: Schema.String,
  expiresAt: Schema.String,
  participants: Schema.Record(Schema.String, PartyReadyRoomParticipantSchema),
});

const activeProjectionFields = {
  volunteers: Schema.optionalKey(Schema.Array(PartyGatheringVolunteerSchema)),
  ...PartyReadyRoomAggregateSchema.fields,
  participants: Schema.Record(
    Schema.String,
    Schema.mutableKey(PartyReadyRoomParticipantSchema),
  ),
  status: Schema.Literal("ACTIVE"),
};

const PartyReadyRoomOrganizerProjectionSchema = Schema.Struct({
  ...activeProjectionFields,
  viewer: Schema.Literal("ORGANIZER"),
  ownedParticipantIds: Schema.mutable(Schema.Array(Schema.String)),
});

const PartyReadyRoomParticipantProjectionSchema = Schema.Struct({
  ...activeProjectionFields,
  viewer: Schema.Literal("PARTICIPANT"),
});

const PartyReadyRoomProjectionSchema = Schema.Union([
  PartyReadyRoomOrganizerProjectionSchema,
  PartyReadyRoomParticipantProjectionSchema,
]);

export const decodePartyReadyRoomProjection = Schema.decodeUnknownSync(
  PartyReadyRoomProjectionSchema,
);

const PartyReadyRoomUpsertUpdateSchema = Schema.Struct({
  schemaVersion: Schema.Literal(3),
  type: Schema.Literal("UPSERT"),
  projection: PartyReadyRoomProjectionSchema,
});

const PartyReadyRoomRemoveUpdateSchema = Schema.Struct({
  schemaVersion: Schema.Literal(3),
  type: Schema.Literal("REMOVE"),
  notificationId: Schema.String,
  revision: Schema.Number,
});

const PartyReadyRoomClientUpdateSchema = Schema.Union([
  PartyReadyRoomUpsertUpdateSchema,
  PartyReadyRoomRemoveUpdateSchema,
]);

export const decodePartyReadyRoomClientUpdate = Schema.decodeUnknownSync(
  PartyReadyRoomClientUpdateSchema,
);
