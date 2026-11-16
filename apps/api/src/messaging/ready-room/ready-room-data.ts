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
} from "#src/contracts/party-ready-room/schemas";

export type ReadyRoomIdentity = {
  readonly userId: string;
  readonly discordId: string;
};

export class ReadyRoomOperationError extends TaggedErrorClass<ReadyRoomOperationError>()(
  "ReadyRoomOperationError",
  { cause: Schema.Defect() },
) {}

type DataEffect = Effect.Effect<unknown, ReadyRoomOperationError>;

export class ReadyRoomData extends Context.Service<
  ReadyRoomData,
  {
    readonly characterOffline: (
      event: typeof GameCharacterOffline.Type,
    ) => DataEffect;
    readonly accessibleGuildIds: (
      discordId: string,
      includeReadable?: boolean,
    ) => DataEffect;
    readonly create: (
      identity: ReadyRoomIdentity,
      guildId: string,
      payload: CreatePartyGatheringRequest,
    ) => DataEffect;
    readonly active: (
      identity: ReadyRoomIdentity,
      accessibleGuildIds: ReadonlyArray<string>,
      world: string,
    ) => DataEffect;
    readonly list: (identity: ReadyRoomIdentity) => DataEffect;
    readonly get: (
      identity: ReadyRoomIdentity,
      notificationId: string,
      accessibleGuildIds: ReadonlyArray<string>,
    ) => DataEffect;
    readonly apply: (
      identity: ReadyRoomIdentity,
      notificationId: string,
      accessibleGuildIds: ReadonlyArray<string>,
      payload: ApplyToPartyReadyRoomRequest,
    ) => DataEffect;
    readonly withdraw: (
      identity: ReadyRoomIdentity,
      notificationId: string,
      payload: PartyParticipantIdentity,
    ) => DataEffect;
    readonly remove: (
      identity: ReadyRoomIdentity,
      notificationId: string,
      payload: PartyParticipantActionRequest,
    ) => DataEffect;
    readonly resolveInvitationTargets: (
      identity: ReadyRoomIdentity,
      notificationId: string,
      payload: ResolvePartyInvitationsRequest,
    ) => DataEffect;
    readonly observeParty: (
      identity: ReadyRoomIdentity,
      notificationId: string,
      payload: ObservePartyRequest,
    ) => DataEffect;
    readonly cancel: (
      identity: ReadyRoomIdentity,
      notificationId: string,
      payload: PartyRevisionRequest,
    ) => DataEffect;
    readonly extend: (
      identity: ReadyRoomIdentity,
      notificationId: string,
      payload: PartyRevisionRequest,
    ) => DataEffect;
    readonly npcKilled: (kill: ReadyRoomNpcKill) => DataEffect;
  }
>()("@lootlog/api/http-api/party-ready-room/data") {}
