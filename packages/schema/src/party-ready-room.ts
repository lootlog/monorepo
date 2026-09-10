import { Schema } from "effect";
import { NonNegativeSafeInteger } from "./http-scalars.js";

export const PARTY_READY_ROOM_STATUSES = ["ACTIVE", "CANCELLED"] as const;

export const PARTY_READY_ROOM_PARTY_PRESENCE_STATES = [
  "OUTSIDE",
  "IN_PARTY",
] as const;

export type PartyReadyRoomStatus = (typeof PARTY_READY_ROOM_STATUSES)[number];

export type PartyReadyRoomPartyPresenceState =
  (typeof PARTY_READY_ROOM_PARTY_PRESENCE_STATES)[number];

export interface PartyReadyRoomClan {
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

export type PartyReadyRoomUpsertUpdate =
  typeof PartyReadyRoomUpsertUpdateSchema.Type;

export type PartyReadyRoomRemoveUpdate =
  typeof PartyReadyRoomRemoveUpdateSchema.Type;

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

export type PartyReadyRoomErrorCode =
  | "ACTIVE_GATHERING_EXISTS"
  | "ALREADY_JOINED_ELSEWHERE"
  | "CHARACTER_ALREADY_JOINED"
  | "FORBIDDEN"
  | "INELIGIBLE_CHARACTER"
  | "INVALID_STATE_TRANSITION"
  | "REVISION_CONFLICT"
  | "ROOM_EXPIRED";

const PartyReadyRoomClanSchema = Schema.Struct({
  id: Schema.optionalKey(Schema.Number),
  name: Schema.optionalKey(Schema.String),
});

export const PartyReadyRoomCharacterSchema = Schema.Struct({
  accountId: Schema.String,
  characterId: Schema.String,
  icon: Schema.String,
  lvl: Schema.Number,
  nick: Schema.String,
  prof: Schema.String,
  clan: Schema.optionalKey(PartyReadyRoomClanSchema),
});

export const PartyReadyRoomParticipantSchema = Schema.Struct({
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
  status: Schema.Literals(PARTY_READY_ROOM_STATUSES),
  revision: Schema.Number,
  createdAt: Schema.String,
  updatedAt: Schema.String,
  expiresAt: Schema.String,
  participants: Schema.Record(Schema.String, PartyReadyRoomParticipantSchema),
});

const activeProjectionFields = {
  ...PartyReadyRoomAggregateSchema.fields,
  participants: Schema.Record(
    Schema.String,
    Schema.mutableKey(PartyReadyRoomParticipantSchema),
  ),
  status: Schema.Literal("ACTIVE"),
};

export const PartyReadyRoomOrganizerProjectionSchema = Schema.Struct({
  ...activeProjectionFields,
  viewer: Schema.Literal("ORGANIZER"),
  ownedParticipantIds: Schema.mutable(Schema.Array(Schema.String)),
});

export const PartyReadyRoomParticipantProjectionSchema = Schema.Struct({
  ...activeProjectionFields,
  viewer: Schema.Literal("PARTICIPANT"),
});

export const PartyReadyRoomProjectionSchema = Schema.Union([
  PartyReadyRoomOrganizerProjectionSchema,
  PartyReadyRoomParticipantProjectionSchema,
]);

export const decodePartyReadyRoomProjection = Schema.decodeUnknownSync(
  PartyReadyRoomProjectionSchema,
);

export const PartyReadyRoomUpsertUpdateSchema = Schema.Struct({
  schemaVersion: Schema.Literal(3),
  type: Schema.Literal("UPSERT"),
  projection: PartyReadyRoomProjectionSchema,
});

export const PartyReadyRoomRemoveUpdateSchema = Schema.Struct({
  schemaVersion: Schema.Literal(3),
  type: Schema.Literal("REMOVE"),
  notificationId: Schema.String,
  revision: Schema.Number,
});

export const PartyReadyRoomClientUpdateSchema = Schema.Union([
  PartyReadyRoomUpsertUpdateSchema,
  PartyReadyRoomRemoveUpdateSchema,
]);

export const decodePartyReadyRoomClientUpdate = Schema.decodeUnknownSync(
  PartyReadyRoomClientUpdateSchema,
);
