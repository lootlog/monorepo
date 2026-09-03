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
  schemaVersion: 3;
  notificationId: string;
  organizerDiscordId: string;
  organizerCharacter: PartyReadyRoomCharacter;
  guildIds: string[];
  world: string;
  description?: string;
  minLvl?: number;
  maxLvl?: number;
  status: "ACTIVE";
  revision: number;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

export interface PartyReadyRoomOrganizerProjection extends PartyReadyRoomProjectionBase {
  viewer: "ORGANIZER";
  participants: Record<string, PartyReadyRoomParticipant>;
  ownedParticipantIds: string[];
}

export interface PartyReadyRoomParticipantProjection extends PartyReadyRoomProjectionBase {
  viewer: "PARTICIPANT";
  participants: Record<string, PartyReadyRoomParticipant>;
}

export type PartyReadyRoomProjection =
  | PartyReadyRoomOrganizerProjection
  | PartyReadyRoomParticipantProjection;

export interface PartyReadyRoomUpsertUpdate {
  schemaVersion: 3;
  type: "UPSERT";
  projection: PartyReadyRoomProjection;
}

export interface PartyReadyRoomRemoveUpdate {
  schemaVersion: 3;
  type: "REMOVE";
  notificationId: string;
  revision: number;
}

export type PartyReadyRoomClientUpdate =
  | PartyReadyRoomUpsertUpdate
  | PartyReadyRoomRemoveUpdate;

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

export const PartyReadyRoomAggregateSchema = Schema.Struct({
  schemaVersion: Schema.Literal(3),
  notificationId: Schema.String,
  organizerDiscordId: Schema.String,
  organizerCharacter: PartyReadyRoomCharacterSchema,
  guildIds: Schema.mutable(Schema.Array(Schema.String)),
  world: Schema.String,
  description: Schema.optionalKey(Schema.String),
  minLvl: Schema.optionalKey(Schema.Number),
  maxLvl: Schema.optionalKey(Schema.Number),
  status: Schema.Literals(PARTY_READY_ROOM_STATUSES),
  revision: Schema.Number,
  createdAt: Schema.String,
  updatedAt: Schema.String,
  expiresAt: Schema.String,
  participants: Schema.Record(Schema.String, PartyReadyRoomParticipantSchema),
});
import { Schema } from "effect";
