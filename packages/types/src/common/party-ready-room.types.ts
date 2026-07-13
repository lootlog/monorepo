export const PARTY_READY_ROOM_STATUSES = [
  "ACTIVE",
  "CLOSED",
  "CANCELLED",
] as const;

export const PARTY_READY_ROOM_APPLICATION_STATES = [
  "APPLIED",
  "ACCEPTED",
  "DECLINED",
  "WITHDRAWN",
] as const;

export const PARTY_READY_ROOM_READINESS_STATES = [
  "NOT_REQUESTED",
  "PENDING",
  "READY",
  "NOT_READY",
] as const;

export const PARTY_READY_ROOM_INVITATION_STATES = [
  "NOT_MARKED",
  "COMMAND_RESERVED",
  "SENT",
  "FAILED",
] as const;

export const PARTY_READY_ROOM_INVITATION_SOURCES = [
  "LOOTLOG_COMMAND",
  "MANUAL_ANNOTATION",
] as const;

export const PARTY_READY_ROOM_PARTY_PRESENCE_STATES = [
  "OUTSIDE",
  "IN_PARTY",
] as const;

export type PartyReadyRoomStatus = (typeof PARTY_READY_ROOM_STATUSES)[number];
export type PartyReadyRoomApplicationState =
  (typeof PARTY_READY_ROOM_APPLICATION_STATES)[number];
export type PartyReadyRoomReadinessState =
  (typeof PARTY_READY_ROOM_READINESS_STATES)[number];
export type PartyReadyRoomInvitationState =
  (typeof PARTY_READY_ROOM_INVITATION_STATES)[number];
export type PartyReadyRoomInvitationSource =
  (typeof PARTY_READY_ROOM_INVITATION_SOURCES)[number];
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

export interface PartyReadyRoomInvitation {
  status: PartyReadyRoomInvitationState;
  source: PartyReadyRoomInvitationSource | null;
  commandId: string | null;
  batchId: string | null;
  reservationExpiresAt: string | null;
  updatedAt: string;
}

export interface PartyReadyRoomParticipant {
  participantId: string;
  applicationVersion: number;
  discordId: string;
  character: PartyReadyRoomCharacter;
  application: PartyReadyRoomApplicationState;
  readiness: PartyReadyRoomReadinessState;
  invitation: PartyReadyRoomInvitation;
  partyPresence: PartyReadyRoomPartyPresenceState;
  createdAt: string;
  updatedAt: string;
}

export interface PartyReadyRoomReadyCheck {
  roundId: number;
  startedAt: string;
}

export interface PartyReadyRoomProjectionBase {
  schemaVersion: 2;
  notificationId: string;
  organizerDiscordId: string;
  organizerCharacter: PartyReadyRoomCharacter;
  guildIds: string[];
  world: string;
  description?: string;
  minLvl?: number;
  maxLvl?: number;
  status: PartyReadyRoomStatus;
  revision: number;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  readyCheck: PartyReadyRoomReadyCheck | null;
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

export interface PartyReadyRoomUpdateEnvelope {
  recipientDiscordId: string;
  eligibleGuildIds: string[];
  projection: PartyReadyRoomProjection;
}

export interface PartyReadyRoomInvitationReservation {
  participantId: string;
  applicationVersion: number;
  characterId: string;
  commandId: string;
}

export interface PartyReadyRoomInvitationTarget {
  participantId: string;
  applicationVersion: number;
}

export interface PartyReadyRoomInvitationBatch {
  batchId: string;
  reservations: PartyReadyRoomInvitationReservation[];
}

export type PartyReadyRoomErrorCode =
  | "ACCEPTED_ELSEWHERE"
  | "ACTIVE_GATHERING_EXISTS"
  | "CHARACTER_ALREADY_APPLIED"
  | "FORBIDDEN"
  | "INELIGIBLE_CHARACTER"
  | "INVALID_STATE_TRANSITION"
  | "REVISION_CONFLICT"
  | "ROOM_EXPIRED"
  | "STALE_COMMAND";
