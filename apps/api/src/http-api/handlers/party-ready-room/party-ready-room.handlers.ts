import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Context, Effect, Schema } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { encodeDomainJson } from "../../domain-json.schema.js";
import { LootlogApi } from "../../lootlog-api.js";
import {
  PartyReadyRoomControllerApply201,
  PartyReadyRoomControllerCancel201,
  PartyReadyRoomControllerCreate201,
  PartyReadyRoomControllerGet200,
  PartyReadyRoomControllerList200,
  PartyReadyRoomControllerObserveParty201,
  PartyReadyRoomControllerRemove200,
  PartyReadyRoomControllerResolveInvitationTargets201,
  PartyReadyRoomControllerWithdraw200,
  type CreatePartyGatheringDto,
  type PartyReadyRoomApplicationDto,
  type PartyReadyRoomExpectedRevisionDto,
  type PartyReadyRoomObservationDto,
  type PartyReadyRoomParticipantActionDto,
  type PartyReadyRoomParticipantIdentityDto,
  type PartyReadyRoomResolveInvitationTargetsDto,
} from "../../contracts/party-ready-room/schemas.js";

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
      payload: CreatePartyGatheringDto,
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
      payload: PartyReadyRoomApplicationDto,
    ) => DataEffect;
    readonly withdraw: (
      identity: ReadyRoomIdentity,
      notificationId: string,
      payload: PartyReadyRoomParticipantIdentityDto,
    ) => DataEffect;
    readonly remove: (
      identity: ReadyRoomIdentity,
      notificationId: string,
      payload: PartyReadyRoomParticipantActionDto,
    ) => DataEffect;
    readonly resolveInvitationTargets: (
      identity: ReadyRoomIdentity,
      notificationId: string,
      payload: PartyReadyRoomResolveInvitationTargetsDto,
    ) => DataEffect;
    readonly observeParty: (
      identity: ReadyRoomIdentity,
      notificationId: string,
      payload: PartyReadyRoomObservationDto,
    ) => DataEffect;
    readonly cancel: (
      identity: ReadyRoomIdentity,
      notificationId: string,
      payload: PartyReadyRoomExpectedRevisionDto,
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
  return yield* decode(PartyReadyRoomControllerList200, value);
});

export const createReadyRoom = Effect.fn("createReadyRoom")(function* (
  payload: CreatePartyGatheringDto,
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
  return yield* decode(PartyReadyRoomControllerCreate201, value);
});

export const getReadyRoom = Effect.fn("getReadyRoom")(function* (
  notificationId: string,
) {
  const current = yield* identity;
  const guildIds = yield* accessibleGuildIds(current.discordId);
  const value = yield* data((service) =>
    service.get(current, notificationId, guildIds),
  );
  return yield* decode(PartyReadyRoomControllerGet200, value);
});

export const applyToReadyRoom = Effect.fn("applyToReadyRoom")(function* (
  notificationId: string,
  payload: PartyReadyRoomApplicationDto,
) {
  const current = yield* identity;
  const guildIds = yield* accessibleGuildIds(current.discordId);
  const value = yield* data((service) =>
    service.apply(current, notificationId, guildIds, payload),
  );
  return yield* decode(PartyReadyRoomControllerApply201, value);
});

export const withdrawFromReadyRoom = Effect.fn("withdrawFromReadyRoom")(
  function* (
    notificationId: string,
    payload: PartyReadyRoomParticipantIdentityDto,
  ) {
    const current = yield* identity;
    yield* assertVisible(current, notificationId);
    const value = yield* data((service) =>
      service.withdraw(current, notificationId, payload),
    );
    return yield* decode(PartyReadyRoomControllerWithdraw200, value);
  },
);

export const removeFromReadyRoom = Effect.fn("removeFromReadyRoom")(function* (
  notificationId: string,
  payload: PartyReadyRoomParticipantActionDto,
) {
  const current = yield* identity;
  yield* assertVisible(current, notificationId);
  const value = yield* data((service) =>
    service.remove(current, notificationId, payload),
  );
  return yield* decode(PartyReadyRoomControllerRemove200, value);
});

export const resolveReadyRoomInvitationTargets = Effect.fn(
  "resolveReadyRoomInvitationTargets",
)(function* (
  notificationId: string,
  payload: PartyReadyRoomResolveInvitationTargetsDto,
) {
  const current = yield* identity;
  yield* assertVisible(current, notificationId);
  const value = yield* data((service) =>
    service.resolveInvitationTargets(current, notificationId, payload),
  );
  return yield* decode(
    PartyReadyRoomControllerResolveInvitationTargets201,
    value,
  );
});

export const observeReadyRoomParty = Effect.fn("observeReadyRoomParty")(
  function* (notificationId: string, payload: PartyReadyRoomObservationDto) {
    const current = yield* identity;
    yield* assertVisible(current, notificationId);
    const value = yield* data((service) =>
      service.observeParty(current, notificationId, payload),
    );
    return yield* decode(PartyReadyRoomControllerObserveParty201, value);
  },
);

export const cancelReadyRoom = Effect.fn("cancelReadyRoom")(function* (
  notificationId: string,
  payload: PartyReadyRoomExpectedRevisionDto,
) {
  const current = yield* identity;
  yield* assertVisible(current, notificationId);
  const value = yield* data((service) =>
    service.cancel(current, notificationId, payload),
  );
  return yield* decode(PartyReadyRoomControllerCancel201, value);
});

const defectCause = (error: unknown) =>
  error instanceof ReadyRoomOperationError ? error.cause : error;

const orDieHttpFailure = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.catch(effect, (error) => Effect.die(defectCause(error)));

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
