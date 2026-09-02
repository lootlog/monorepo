import { Context, Effect, Layer, Schema } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import {
  Permission,
  type Permission as PermissionValue,
} from "@lootlog/schema/permissions";
import type { ReservationMutationsService } from "#src/reservations/reservation-mutations.service";
import type { ReservationSharingService } from "#src/reservations/reservation-sharing.service";
import type { ReservationViewerContext } from "#src/reservations/reservation-viewer";
import type { ReservationsService } from "#src/reservations/reservations.service";
import type { ReservationReadService } from "#src/reservations/reservation-read.service";
import type { RolesService } from "#src/roles/roles.service";
import type { CreateReservationDto as LegacyCreateReservationDto } from "#src/reservations/dto/create-reservation.dto";
import type { MyReservationsQueryDto as LegacyMyReservationsQueryDto } from "#src/reservations/dto/reservation-query.dto";
import type { UpdateReservationDto as LegacyUpdateReservationDto } from "#src/reservations/dto/update-reservation.dto";
import type { UpdateRolePermissionsDto as LegacyUpdateRolePermissionsDto } from "#src/roles/dto/update-role-permissions.dto";
import {
  AcceptReservationShareInvitation201,
  CreateReservation201,
  CreateReservationShareInvitation201,
  ListMyReservations200,
  ListReservationSpots200,
  ListReservationShares200,
  ListSpotReservations200,
  LootlogApi,
  PreviewReservationShareInvitation200,
  RolesControllerGetGuildRoles200,
  RolesControllerUpdateGuildRole200,
  UpdateMyReservation200,
  type AcceptReservationShareInvitationDto,
  type CreateReservationDto,
  type ListMyReservationsQuery,
  type UpdateReservationDto,
  type UpdateRolePermissionsDto,
} from "../../lootlog-api.generated.js";

export type ReservationsRolesIdentity = {
  readonly userId: string;
  readonly discordId: string;
};

export type ReservationsRolesGuildAccess = ReservationsRolesIdentity & {
  readonly guildId: string;
  readonly ownerId: string;
  readonly permissions: ReadonlyArray<PermissionValue>;
};

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class ReservationsRolesAccessDenied extends Schema.TaggedError<ReservationsRolesAccessDenied>()(
  "ReservationsRolesAccessDenied",
  { status: Schema.Literals([401, 403]), code: Schema.String },
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class ReservationsRolesNotFound extends Schema.TaggedError<ReservationsRolesNotFound>()(
  "ReservationsRolesNotFound",
  { status: Schema.Literal(404), code: Schema.String },
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class ReservationsRolesOperationError extends Schema.TaggedError<ReservationsRolesOperationError>()(
  "ReservationsRolesOperationError",
  { cause: Schema.Defect() },
) {}

type AccessFailure = ReservationsRolesAccessDenied | ReservationsRolesNotFound;

export class ReservationsRolesAuthorization extends Context.Service<
  ReservationsRolesAuthorization,
  {
    readonly identity: Effect.Effect<
      ReservationsRolesIdentity,
      ReservationsRolesAccessDenied
    >;
    readonly requireGuild: (options: {
      readonly guildId: string;
      readonly allOf?: ReadonlyArray<PermissionValue>;
      readonly anyOf?: ReadonlyArray<PermissionValue>;
    }) => Effect.Effect<ReservationsRolesGuildAccess, AccessFailure>;
  }
>()("@lootlog/api/http-api/reservations-roles/authorization") {}

type DataEffect = Effect.Effect<unknown, ReservationsRolesOperationError>;

const mutableDto = <A>(value: unknown): A =>
  JSON.parse(JSON.stringify(value)) as A;

export class ReservationsRolesData extends Context.Service<
  ReservationsRolesData,
  {
    readonly create: (
      context: ReservationViewerContext,
      spotId: string,
      payload: CreateReservationDto,
    ) => DataEffect;
    readonly deleteVisible: (
      context: ReservationViewerContext,
      reservationId: number,
    ) => DataEffect;
    readonly listMine: (
      identity: ReservationsRolesIdentity,
      query: ListMyReservationsQuery,
    ) => DataEffect;
    readonly deleteOwned: (
      identity: ReservationsRolesIdentity,
      reservationId: number,
    ) => DataEffect;
    readonly updateOwned: (
      identity: ReservationsRolesIdentity,
      reservationId: number,
      payload: UpdateReservationDto,
    ) => DataEffect;
  }
>()("@lootlog/api/http-api/reservations-roles/data") {
  static layerServices(options: {
    readonly reservations: ReservationsService;
    readonly mutations: ReservationMutationsService;
  }) {
    const attempt = (operation: () => PromiseLike<unknown>) =>
      Effect.tryPromise({
        try: operation,
        catch: (cause) => new ReservationsRolesOperationError({ cause }),
      });
    return Layer.succeed(
      ReservationsRolesData,
      ReservationsRolesData.of({
        create: (context, spotId, payload) =>
          attempt(() =>
            options.mutations.create({
              context,
              spotId,
              data: mutableDto<LegacyCreateReservationDto>(payload),
            }),
          ),
        deleteVisible: (context, reservationId) =>
          attempt(() =>
            options.mutations.deleteVisible({ context, reservationId }),
          ),
        listMine: ({ userId, discordId }, query) =>
          attempt(() =>
            options.reservations.listMine({
              userId,
              discordId,
              query: mutableDto<LegacyMyReservationsQueryDto>(query),
            }),
          ),
        deleteOwned: ({ userId, discordId }, reservationId) =>
          attempt(() =>
            options.mutations.deleteOwned({
              userId,
              discordId,
              reservationId,
            }),
          ),
        updateOwned: ({ userId, discordId }, reservationId, payload) =>
          attempt(() =>
            options.mutations.updateOwned({
              userId,
              discordId,
              reservationId,
              data: mutableDto<LegacyUpdateReservationDto>(payload),
            }),
          ),
      }),
    );
  }
}

export class ReservationReadData extends Context.Service<
  ReservationReadData,
  {
    readonly listSpots: (context: ReservationViewerContext) => DataEffect;
    readonly listWindow: (
      context: ReservationViewerContext,
      spotId: string,
      from: string,
      to: string,
    ) => DataEffect;
    readonly pinSpot: (
      userId: string,
      guildId: string,
      spotId: string,
    ) => DataEffect;
    readonly unpinSpot: (
      userId: string,
      guildId: string,
      spotId: string,
    ) => DataEffect;
  }
>()("@lootlog/api/http-api/reservation-read/data") {
  static makeService(
    service: ReservationReadService,
  ): ReservationReadData["Service"] {
    const attempt = (operation: () => PromiseLike<unknown>) =>
      Effect.tryPromise({
        try: operation,
        catch: (cause) => new ReservationsRolesOperationError({ cause }),
      });
    return ReservationReadData.of({
      listSpots: (context) => attempt(() => service.listSpots(context)),
      listWindow: (context, spotId, from, to) =>
        attempt(() => service.listWindow(context, spotId, from, to)),
      pinSpot: (userId, guildId, spotId) =>
        attempt(() => service.pinSpot(userId, guildId, spotId)),
      unpinSpot: (userId, guildId, spotId) =>
        attempt(() => service.unpinSpot(userId, guildId, spotId)),
    });
  }
}

export class ReservationSharingData extends Context.Service<
  ReservationSharingData,
  {
    readonly listShares: (guildId: string) => DataEffect;
    readonly createInvitation: (guildId: string, userId: string) => DataEffect;
    readonly revokeInvitation: (
      guildId: string,
      invitationId: string,
    ) => DataEffect;
    readonly revokeShare: (guildId: string, shareId: string) => DataEffect;
    readonly previewInvitation: (
      token: string,
      discordId: string,
    ) => DataEffect;
    readonly acceptInvitation: (
      token: string,
      payload: AcceptReservationShareInvitationDto,
      identity: ReservationsRolesIdentity,
    ) => DataEffect;
  }
>()("@lootlog/api/http-api/reservation-sharing/data") {
  static makeService(
    service: ReservationSharingService,
  ): ReservationSharingData["Service"] {
    const attempt = (operation: () => PromiseLike<unknown>) =>
      Effect.tryPromise({
        try: operation,
        catch: (cause) => new ReservationsRolesOperationError({ cause }),
      });
    return ReservationSharingData.of({
      listShares: (guildId) => attempt(() => service.list(guildId)),
      createInvitation: (guildId, userId) =>
        attempt(() => service.createInvitation(guildId, userId)),
      revokeInvitation: (guildId, invitationId) =>
        attempt(() => service.revokeInvitation(guildId, invitationId)),
      revokeShare: (guildId, shareId) =>
        attempt(() => service.revokeShare(guildId, shareId)),
      previewInvitation: (token, discordId) =>
        attempt(() => service.previewInvitation(token, discordId)),
      acceptInvitation: (token, payload, { userId, discordId }) =>
        attempt(() =>
          service.acceptInvitation({
            token,
            targetGuildId: payload.targetGuildId,
            userId,
            discordId,
          }),
        ),
    });
  }
}

export class RolesData extends Context.Service<
  RolesData,
  {
    readonly getRoles: (guildId: string) => DataEffect;
    readonly updateRole: (
      discordId: string,
      guildId: string,
      roleId: string,
      payload: UpdateRolePermissionsDto,
    ) => DataEffect;
  }
>()("@lootlog/api/http-api/roles/data") {
  static makeService(service: RolesService): RolesData["Service"] {
    const attempt = (operation: () => PromiseLike<unknown>) =>
      Effect.tryPromise({
        try: operation,
        catch: (cause) => new ReservationsRolesOperationError({ cause }),
      });

    return RolesData.of({
      getRoles: (guildId) => attempt(() => service.getRolesByGuildId(guildId)),
      updateRole: (discordId, guildId, roleId, payload) =>
        attempt(() =>
          service.updateRolePermissions(
            discordId,
            guildId,
            roleId,
            mutableDto<LegacyUpdateRolePermissionsDto>(payload),
          ),
        ),
    });
  }
}

const identity = Effect.flatMap(
  ReservationsRolesAuthorization,
  (authorization) => authorization.identity,
);

const requireGuild = (
  guildId: string,
  permissions:
    | ReadonlyArray<PermissionValue>
    | {
        readonly allOf?: ReadonlyArray<PermissionValue>;
        readonly anyOf?: ReadonlyArray<PermissionValue>;
      },
) =>
  Effect.flatMap(ReservationsRolesAuthorization, (authorization) =>
    authorization.requireGuild({
      guildId,
      ...(Array.isArray(permissions) ? { allOf: permissions } : permissions),
    }),
  );

const data = <A>(
  operation: (
    service: ReservationsRolesData["Service"],
  ) => Effect.Effect<A, ReservationsRolesOperationError>,
) => Effect.flatMap(ReservationsRolesData, operation);

const readData = <A>(
  operation: (
    service: ReservationReadData["Service"],
  ) => Effect.Effect<A, ReservationsRolesOperationError>,
) => Effect.flatMap(ReservationReadData, operation);

const rolesData = <A>(
  operation: (
    service: RolesData["Service"],
  ) => Effect.Effect<A, ReservationsRolesOperationError>,
) => Effect.flatMap(RolesData, operation);

const sharingData = <A>(
  operation: (
    service: ReservationSharingData["Service"],
  ) => Effect.Effect<A, ReservationsRolesOperationError>,
) => Effect.flatMap(ReservationSharingData, operation);

const toViewer = (
  access: ReservationsRolesGuildAccess,
): ReservationViewerContext => ({
  guildId: access.guildId,
  userId: access.userId,
  discordId: access.discordId,
  actorIsOwner: access.ownerId === access.discordId,
  permissions: [...access.permissions],
});

const toWire = (value: unknown): unknown => {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(toWire);
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, nested]) => [key, toWire(nested)]),
  );
};

const decode = <A, I, R>(schema: Schema.Codec<A, I, R>, value: unknown) =>
  Schema.decodeUnknownEffect(schema)(toWire(value)).pipe(
    Effect.mapError((cause) => new ReservationsRolesOperationError({ cause })),
  );

const defectCause = (error: unknown) =>
  error instanceof ReservationsRolesOperationError ? error.cause : error;

const orDieHttpFailure = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.catch(effect, (error) => Effect.die(defectCause(error)));

const errorStatus = (error: unknown): number | undefined => {
  if (
    error instanceof ReservationsRolesAccessDenied ||
    error instanceof ReservationsRolesNotFound
  ) {
    return error.status;
  }
  const cause = defectCause(error);
  if (
    typeof cause === "object" &&
    cause !== null &&
    "getStatus" in cause &&
    typeof cause.getStatus === "function"
  ) {
    return cause.getStatus();
  }
  return undefined;
};

const declaredEmptyError = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  statuses: ReadonlyArray<number>,
) =>
  Effect.catch(effect, (error) =>
    statuses.includes(errorStatus(error) ?? 0)
      ? Effect.fail(undefined)
      : Effect.die(defectCause(error)),
  );

const pathString = (value: unknown, name: string) =>
  typeof value === "string"
    ? Effect.succeed(value)
    : Effect.die(new TypeError(`${name} path parameter must be a string`));

export const listReservationSpots = Effect.fn("listReservationSpots")(
  function* (guildId: string) {
    const access = yield* requireGuild(guildId, [
      Permission.LOOTLOG_RESERVATIONS_READ,
    ]);
    const value = yield* readData((service) =>
      service.listSpots(toViewer(access)),
    );
    return yield* decode(ListReservationSpots200, value);
  },
);

export const createReservation = Effect.fn("createReservation")(function* (
  guildId: string,
  spotId: string,
  payload: CreateReservationDto,
) {
  const access = yield* requireGuild(guildId, [
    Permission.LOOTLOG_RESERVATIONS_READ,
    Permission.LOOTLOG_RESERVATIONS_WRITE,
  ]);
  const value = yield* data((service) =>
    service.create(toViewer(access), spotId, payload),
  );
  return yield* decode(CreateReservation201, value);
});

export const deleteVisibleReservation = Effect.fn("deleteVisibleReservation")(
  function* (guildId: string, reservationId: number) {
    const access = yield* requireGuild(guildId, [
      Permission.LOOTLOG_RESERVATIONS_READ,
      Permission.LOOTLOG_RESERVATIONS_WRITE,
    ]);
    yield* data((service) =>
      service.deleteVisible(toViewer(access), reservationId),
    );
  },
);

export const updateGuildRole = Effect.fn("updateGuildRole")(function* (
  guildId: string,
  roleId: string,
  payload: UpdateRolePermissionsDto,
) {
  const access = yield* requireGuild(guildId, [
    Permission.LOOTLOG_ACCESS,
    Permission.ADMIN,
  ]);
  const value = yield* rolesData((service) =>
    service.updateRole(access.discordId, access.guildId, roleId, payload),
  );
  return yield* decode(RolesControllerUpdateGuildRole200, value);
});

export const ReservationsHandlers = HttpApiBuilder.group(
  LootlogApi,
  "reservations",
  (handlers) =>
    handlers
      .handle("listReservationSpots", ({ params }) =>
        orDieHttpFailure(listReservationSpots(params.guildId)),
      )
      .handle("listSpotReservations", ({ params, query }) =>
        orDieHttpFailure(
          Effect.gen(function* () {
            const access = yield* requireGuild(params.guildId, [
              Permission.LOOTLOG_RESERVATIONS_READ,
            ]);
            const value = yield* readData((service) =>
              service.listWindow(
                toViewer(access),
                params.spotId,
                query.from,
                query.to,
              ),
            );
            return yield* decode(ListSpotReservations200, value);
          }),
        ),
      )
      .handle("createReservation", ({ params, payload }) =>
        orDieHttpFailure(
          createReservation(params.guildId, params.spotId, payload),
        ),
      )
      .handle("deleteReservation", ({ params }) =>
        orDieHttpFailure(
          deleteVisibleReservation(params.guildId, params.reservationId),
        ),
      )
      .handle("pinReservationSpot", ({ params }) =>
        orDieHttpFailure(
          Effect.gen(function* () {
            const access = yield* requireGuild(params.guildId, [
              Permission.LOOTLOG_RESERVATIONS_READ,
            ]);
            yield* readData((service) =>
              service.pinSpot(access.userId, access.guildId, params.spotId),
            );
          }),
        ),
      )
      .handle("unpinReservationSpot", ({ params }) =>
        orDieHttpFailure(
          Effect.gen(function* () {
            const access = yield* requireGuild(params.guildId, [
              Permission.LOOTLOG_RESERVATIONS_READ,
            ]);
            yield* readData((service) =>
              service.unpinSpot(access.userId, access.guildId, params.spotId),
            );
          }),
        ),
      )
      .handle("listMyReservations", ({ query }) =>
        orDieHttpFailure(
          Effect.gen(function* () {
            const current = yield* identity;
            const value = yield* data((service) =>
              service.listMine(current, query),
            );
            return yield* decode(ListMyReservations200, value);
          }),
        ),
      )
      .handle("deleteMyReservation", ({ params }) =>
        orDieHttpFailure(
          Effect.gen(function* () {
            const current = yield* identity;
            yield* data((service) =>
              service.deleteOwned(current, params.reservationId),
            );
          }),
        ),
      )
      .handle("updateMyReservation", ({ params, payload }) =>
        orDieHttpFailure(
          Effect.gen(function* () {
            const current = yield* identity;
            const value = yield* data((service) =>
              service.updateOwned(current, params.reservationId, payload),
            );
            return yield* decode(UpdateMyReservation200, value);
          }),
        ),
      ),
);

const requireSharingAdmin = (guildId: string) =>
  requireGuild(guildId, {
    anyOf: [Permission.OWNER, Permission.ADMIN],
  });

export const listReservationShares = Effect.fn("listReservationShares")(
  function* (guildId: string) {
    const access = yield* requireSharingAdmin(guildId);
    const value = yield* sharingData((service) =>
      service.listShares(access.guildId),
    );
    return yield* decode(ListReservationShares200, value);
  },
);

export const previewReservationShareInvitation = Effect.fn(
  "previewReservationShareInvitation",
)(function* (token: string) {
  const current = yield* identity;
  const value = yield* sharingData((service) =>
    service.previewInvitation(token, current.discordId),
  );
  return yield* decode(PreviewReservationShareInvitation200, value);
});

export const acceptReservationShareInvitation = Effect.fn(
  "acceptReservationShareInvitation",
)(function* (token: string, payload: AcceptReservationShareInvitationDto) {
  const current = yield* identity;
  const value = yield* sharingData((service) =>
    service.acceptInvitation(token, payload, current),
  );
  return yield* decode(AcceptReservationShareInvitation201, value);
});

export const ReservationSharingHandlers = HttpApiBuilder.group(
  LootlogApi,
  "reservation-sharing",
  (handlers) =>
    handlers
      .handle("listReservationShares", ({ params }) =>
        orDieHttpFailure(listReservationShares(params.guildId)),
      )
      .handle("createReservationShareInvitation", ({ params }) =>
        orDieHttpFailure(
          Effect.gen(function* () {
            const access = yield* requireSharingAdmin(params.guildId);
            const value = yield* sharingData((service) =>
              service.createInvitation(access.guildId, access.userId),
            );
            return yield* decode(CreateReservationShareInvitation201, value);
          }),
        ),
      )
      .handle("revokeReservationShareInvitation", ({ params }) =>
        orDieHttpFailure(
          Effect.gen(function* () {
            const access = yield* requireSharingAdmin(params.guildId);
            yield* sharingData((service) =>
              service.revokeInvitation(access.guildId, params.invitationId),
            );
          }),
        ),
      )
      .handle("revokeReservationShare", ({ params }) =>
        orDieHttpFailure(
          Effect.gen(function* () {
            const access = yield* requireSharingAdmin(params.guildId);
            yield* sharingData((service) =>
              service.revokeShare(access.guildId, params.shareId),
            );
          }),
        ),
      )
      .handle("previewReservationShareInvitation", ({ params }) =>
        orDieHttpFailure(previewReservationShareInvitation(params.token)),
      )
      .handle("acceptReservationShareInvitation", ({ params, payload }) =>
        orDieHttpFailure(
          acceptReservationShareInvitation(params.token, payload),
        ),
      ),
);

export const RolesHandlers = HttpApiBuilder.group(
  LootlogApi,
  "roles",
  (handlers) =>
    handlers
      .handle("RolesControllerGetGuildRoles", ({ params }) =>
        declaredEmptyError(
          Effect.gen(function* () {
            const guildId = yield* pathString(params.guildId, "guildId");
            const access = yield* requireGuild(guildId, [
              Permission.LOOTLOG_ACCESS,
            ]);
            const value = yield* rolesData((service) =>
              service.getRoles(access.guildId),
            );
            return yield* decode(RolesControllerGetGuildRoles200, value);
          }),
          [403],
        ),
      )
      .handle("RolesControllerUpdateGuildRole", ({ params, payload }) =>
        declaredEmptyError(
          Effect.flatMap(pathString(params.guildId, "guildId"), (guildId) =>
            updateGuildRole(guildId, params.roleId, payload),
          ),
          [403, 404],
        ),
      ),
);
