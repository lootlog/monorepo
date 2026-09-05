import { applicationErrorResponse } from "../../application-error-response.js";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Context, Effect, Schema } from "effect";
import { HttpServerResponse } from "effect/unstable/http";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { encodeDomainJson } from "../../domain-json.schema.js";
import { LootlogApi } from "../../lootlog-api.js";
import {
  PartyReadyRoomResponse,
  PartyReadyRoomUpdateResponse,
  PartyReadyRoomsResponse,
  PartyInvitationTargetsResponse,
  type CreatePartyGatheringRequest,
  type ApplyToPartyReadyRoomRequest,
  type PartyRevisionRequest,
  type ObservePartyRequest,
  type PartyParticipantActionRequest,
  type PartyParticipantIdentity,
  type ResolvePartyInvitationsRequest,
} from "#src/contracts/party-ready-room/schemas";

export type ReadyRoomIdentity = {
  readonly userId: string;
  readonly discordId: string;
};

export class ReadyRoomAccessDenied extends TaggedErrorClass<ReadyRoomAccessDenied>()(
  "ReadyRoomAccessDenied",
  { status: Schema.Literals([401, 403]), code: Schema.String },
) {}

export class ReadyRoomOperationError extends TaggedErrorClass<ReadyRoomOperationError>()(
  "ReadyRoomOperationError",
  { cause: Schema.Defect() },
) {}

export class ReadyRoomAuthorization extends Context.Service<
  ReadyRoomAuthorization,
  { readonly identity: Effect.Effect<ReadyRoomIdentity, ReadyRoomAccessDenied> }
>()("@lootlog/api/http-api/party-ready-room/authorization") {}

type DataEffect = Effect.Effect<unknown, ReadyRoomOperationError>;

export class ReadyRoomData extends Context.Service<
  ReadyRoomData,
  {
    readonly accessibleGuildIds: (discordId: string) => DataEffect;
    readonly create: (
      identity: ReadyRoomIdentity,
      guildIds: ReadonlyArray<string>,
      payload: CreatePartyGatheringRequest,
    ) => DataEffect;
    readonly list: (
      identity: ReadyRoomIdentity,
      accessibleGuildIds: ReadonlyArray<string>,
    ) => DataEffect;
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
  }
>()("@lootlog/api/http-api/party-ready-room/data") {}

const identity = Effect.flatMap(
  ReadyRoomAuthorization,
  (authorization) => authorization.identity,
);

const data = <A>(
  operation: (
    service: ReadyRoomData["Service"],
  ) => Effect.Effect<A, ReadyRoomOperationError>,
) => Effect.flatMap(ReadyRoomData, operation);

const accessibleGuildIds = (discordId: string) =>
  data((service) => service.accessibleGuildIds(discordId)).pipe(
    Effect.flatMap((value) =>
      Array.isArray(value)
        ? Effect.succeed(
            value.filter((id): id is string => typeof id === "string"),
          )
        : Effect.die(new TypeError("Accessible guild IDs must be an array")),
    ),
  );

const decode = <A, I, R>(schema: Schema.Codec<A, I, R>, value: unknown) =>
  encodeDomainJson(value).pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(schema)),
    Effect.mapError((cause) => new ReadyRoomOperationError({ cause })),
  );

const assertVisible = Effect.fn("assertReadyRoomVisible")(function* (
  current: ReadyRoomIdentity,
  notificationId: string,
) {
  const guildIds = yield* accessibleGuildIds(current.discordId);
  yield* data((service) => service.get(current, notificationId, guildIds));
});

export const listReadyRooms = Effect.fn("listReadyRooms")(function* () {
  const current = yield* identity;
  const guildIds = yield* accessibleGuildIds(current.discordId);
  const value = yield* data((service) => service.list(current, guildIds));
  return yield* decode(PartyReadyRoomsResponse, value);
});

export const createReadyRoom = Effect.fn("createReadyRoom")(function* (
  payload: CreatePartyGatheringRequest,
) {
  const current = yield* identity;
  const accessible = yield* accessibleGuildIds(current.discordId);
  const guildIds = payload.guildIds.filter((guildId) =>
    accessible.includes(guildId),
  );
  if (guildIds.length === 0) {
    return yield* new ReadyRoomAccessDenied({
      status: 403,
      code: "FORBIDDEN",
    });
  }
  const value = yield* data((service) =>
    service.create(current, guildIds, payload),
  );
  return yield* decode(PartyReadyRoomResponse, value);
});

export const getReadyRoom = Effect.fn("getReadyRoom")(function* (
  notificationId: string,
) {
  const current = yield* identity;
  const guildIds = yield* accessibleGuildIds(current.discordId);
  const value = yield* data((service) =>
    service.get(current, notificationId, guildIds),
  );
  return yield* decode(PartyReadyRoomResponse, value);
});

export const applyToReadyRoom = Effect.fn("applyToReadyRoom")(function* (
  notificationId: string,
  payload: ApplyToPartyReadyRoomRequest,
) {
  const current = yield* identity;
  const guildIds = yield* accessibleGuildIds(current.discordId);
  const value = yield* data((service) =>
    service.apply(current, notificationId, guildIds, payload),
  );
  return yield* decode(PartyReadyRoomResponse, value);
});

export const withdrawFromReadyRoom = Effect.fn("withdrawFromReadyRoom")(
  function* (notificationId: string, payload: PartyParticipantIdentity) {
    const current = yield* identity;
    yield* assertVisible(current, notificationId);
    const value = yield* data((service) =>
      service.withdraw(current, notificationId, payload),
    );
    return yield* decode(PartyReadyRoomUpdateResponse, value);
  },
);

export const removeFromReadyRoom = Effect.fn("removeFromReadyRoom")(function* (
  notificationId: string,
  payload: PartyParticipantActionRequest,
) {
  const current = yield* identity;
  yield* assertVisible(current, notificationId);
  const value = yield* data((service) =>
    service.remove(current, notificationId, payload),
  );
  return yield* decode(PartyReadyRoomUpdateResponse, value);
});

export const resolveReadyRoomInvitationTargets = Effect.fn(
  "resolveReadyRoomInvitationTargets",
)(function* (notificationId: string, payload: ResolvePartyInvitationsRequest) {
  const current = yield* identity;
  yield* assertVisible(current, notificationId);
  const value = yield* data((service) =>
    service.resolveInvitationTargets(current, notificationId, payload),
  );
  return yield* decode(PartyInvitationTargetsResponse, value);
});

export const observeReadyRoomParty = Effect.fn("observeReadyRoomParty")(
  function* (notificationId: string, payload: ObservePartyRequest) {
    const current = yield* identity;
    yield* assertVisible(current, notificationId);
    const value = yield* data((service) =>
      service.observeParty(current, notificationId, payload),
    );
    return yield* decode(PartyReadyRoomResponse, value);
  },
);

export const cancelReadyRoom = Effect.fn("cancelReadyRoom")(function* (
  notificationId: string,
  payload: PartyRevisionRequest,
) {
  const current = yield* identity;
  yield* assertVisible(current, notificationId);
  const value = yield* data((service) =>
    service.cancel(current, notificationId, payload),
  );
  return yield* decode(PartyReadyRoomUpdateResponse, value);
});

type ReadyRoomHttpFailure = ReadyRoomAccessDenied | ReadyRoomOperationError;

const orDieHttpFailure = <A, R>(
  effect: Effect.Effect<A, ReadyRoomHttpFailure, R>,
) =>
  Effect.catchTags(effect, {
    ReadyRoomAccessDenied: (error) =>
      Effect.succeed(
        HttpServerResponse.jsonUnsafe(
          { code: error.code },
          { status: error.status },
        ),
      ),
    ReadyRoomOperationError: (error) => applicationErrorResponse(error.cause),
  });

export const PartyReadyRoomHandlers = HttpApiBuilder.group(
  LootlogApi,
  "party-ready-room",
  (handlers) =>
    handlers
      .handle("PartyReadyRoomControllerList", () =>
        orDieHttpFailure(listReadyRooms()),
      )
      .handle("PartyReadyRoomControllerCreate", ({ payload }) =>
        orDieHttpFailure(createReadyRoom(payload)),
      )
      .handle("PartyReadyRoomControllerGet", ({ params }) =>
        orDieHttpFailure(getReadyRoom(params.notificationId)),
      )
      .handle("PartyReadyRoomControllerApply", ({ params, payload }) =>
        orDieHttpFailure(applyToReadyRoom(params.notificationId, payload)),
      )
      .handle("PartyReadyRoomControllerWithdraw", ({ params, payload }) =>
        orDieHttpFailure(withdrawFromReadyRoom(params.notificationId, payload)),
      )
      .handle("PartyReadyRoomControllerRemove", ({ params, payload }) =>
        orDieHttpFailure(removeFromReadyRoom(params.notificationId, payload)),
      )
      .handle(
        "PartyReadyRoomControllerResolveInvitationTargets",
        ({ params, payload }) =>
          orDieHttpFailure(
            resolveReadyRoomInvitationTargets(params.notificationId, payload),
          ),
      )
      .handle("PartyReadyRoomControllerObserveParty", ({ params, payload }) =>
        orDieHttpFailure(observeReadyRoomParty(params.notificationId, payload)),
      )
      .handle("PartyReadyRoomControllerCancel", ({ params, payload }) =>
        orDieHttpFailure(cancelReadyRoom(params.notificationId, payload)),
      ),
);
