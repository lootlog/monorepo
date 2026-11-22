import type { GameCharacterOffline } from "@lootlog/protocol/rabbit/events";
import type { ReadyRoomNpcKill } from "./ready-room-lifecycle.js";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Context, Effect, Schema } from "effect";
import type {
  CreatePartyGatheringRequest,
  ApplyToPartyReadyRoomRequest,
  PartyRevisionRequest,
  ObservePartyRequest,
  PartyParticipantActionRequest,
  PartyParticipantIdentity,
  ResolvePartyInvitationsRequest,
  PartyInvitationTargetsResponse,
  PartyReadyRoomsResponse,
} from "#src/contracts/party-ready-room/schemas";
import type {
  PartyGatheringSummary,
  PartyReadyRoomClientUpdate,
  PartyReadyRoomProjection,
} from "@lootlog/schema/party-ready-room";

export type ReadyRoomIdentity = {
  readonly userId: string;
  readonly discordId: string;
};

export class ReadyRoomOperationError extends TaggedErrorClass<
  ReadyRoomOperationError,
  { readonly brand: unique symbol }
>()("ReadyRoomOperationError", { cause: Schema.Defect() }) {}

type DataEffect<A> = Effect.Effect<A, ReadyRoomOperationError>;

export class ReadyRoomData extends Context.Service<
  ReadyRoomData,
  {
    readonly characterOffline: (
      event: GameCharacterOffline,
    ) => DataEffect<void>;
    readonly accessibleGuildIds: (
      discordId: string,
      includeReadable?: boolean,
    ) => DataEffect<ReadonlyArray<string>>;
    readonly create: (
      identity: ReadyRoomIdentity,
      guildId: string,
      payload: CreatePartyGatheringRequest,
    ) => DataEffect<PartyReadyRoomProjection | null>;
    readonly active: (
      identity: ReadyRoomIdentity,
      accessibleGuildIds: ReadonlyArray<string>,
      world: string,
    ) => DataEffect<ReadonlyArray<PartyGatheringSummary>>;
    readonly list: (
      identity: ReadyRoomIdentity,
    ) => DataEffect<PartyReadyRoomsResponse>;
    readonly get: (
      identity: ReadyRoomIdentity,
      notificationId: string,
      accessibleGuildIds: ReadonlyArray<string>,
    ) => DataEffect<PartyReadyRoomProjection>;
    readonly apply: (
      identity: ReadyRoomIdentity,
      notificationId: string,
      accessibleGuildIds: ReadonlyArray<string>,
      payload: ApplyToPartyReadyRoomRequest,
    ) => DataEffect<PartyReadyRoomProjection | null>;
    readonly withdraw: (
      identity: ReadyRoomIdentity,
      notificationId: string,
      payload: PartyParticipantIdentity,
    ) => DataEffect<PartyReadyRoomClientUpdate>;
    readonly remove: (
      identity: ReadyRoomIdentity,
      notificationId: string,
      payload: PartyParticipantActionRequest,
    ) => DataEffect<PartyReadyRoomClientUpdate>;
    readonly resolveInvitationTargets: (
      identity: ReadyRoomIdentity,
      notificationId: string,
      payload: ResolvePartyInvitationsRequest,
    ) => DataEffect<PartyInvitationTargetsResponse>;
    readonly observeParty: (
      identity: ReadyRoomIdentity,
      notificationId: string,
      payload: ObservePartyRequest,
    ) => DataEffect<PartyReadyRoomProjection | null>;
    readonly cancel: (
      identity: ReadyRoomIdentity,
      notificationId: string,
      payload: PartyRevisionRequest,
    ) => DataEffect<PartyReadyRoomClientUpdate>;
    readonly extend: (
      identity: ReadyRoomIdentity,
      notificationId: string,
      payload: PartyRevisionRequest,
    ) => DataEffect<PartyReadyRoomProjection | null>;
    readonly npcKilled: (kill: ReadyRoomNpcKill) => DataEffect<void>;
  }
>()("@lootlog/api/http-api/party-ready-room/data") {}
