import { RolesData } from "#src/guilds/roles-data";
import {
  OrganizationWorkspaceData,
  MyReservationsData,
  ReservationReadData,
  ReservationSharingData,
} from "#src/reservations/reservations-data";
import {
  type OrganizationWorkspaceIdentity,
  OrganizationWorkspaceOperationError,
} from "#src/guilds/organization-workspace-access";

import {
  AcceptedReservationShareBoundary,
  CreatedReservationShareInvitationBoundary,
  ReservationSharesBoundary,
  ReservationShareInvitationPreviewBoundary,
  ReservationBoundary,
  MyReservationsBoundary,
  ReservationSpotsBoundary,
  ReservationWindowBoundary,
} from "./organization-workspace-response.schema.js";

import {
  pathString,
  statusCodeResponse,
  reauthenticationRequiredResponse,
} from "#src/shared/http/handler-response";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Context, Effect, Schema } from "effect";
import { applicationErrorResponse } from "#src/http-api/application-error-response";
import { AccessRequirement } from "@lootlog/domain/access-policy";
import {
  Permission,
  type Permission as PermissionValue,
} from "@lootlog/schema/permissions";
import type { ReservationViewerContext } from "#src/reservations/reservation-viewer";

import {
  ApplicationError,
  applicationErrorStatus,
  applicationErrorStatusOrUndefined,
} from "#src/shared/http/http-errors";

import type { AcceptReservationShareInvitationRequest } from "#src/contracts/reservation-sharing/schemas";

import type {
  CreateReservationRequest,
  MyReservationsQuery,
  ReservationWindowQuery,
  UpdateReservationRequest,
} from "#src/contracts/reservations/schemas";

import {
  RolesResponse,
  RoleResponse,
  type UpdateRolePermissionsRequest,
} from "#src/contracts/roles/schemas";
import type { ReauthenticationRequired } from "#src/http-api/contracts/shared";

export type OrganizationWorkspaceGuildAccess = OrganizationWorkspaceIdentity & {
  readonly guildId: string;
  readonly ownerId: string;
  readonly permissions: ReadonlyArray<PermissionValue>;
};

export class OrganizationWorkspaceAccessDenied extends TaggedErrorClass<OrganizationWorkspaceAccessDenied>()(
  "OrganizationWorkspaceAccessDenied",
  { status: Schema.Literals([401, 403]), code: Schema.String },
) {}

export class OrganizationWorkspaceNotFound extends TaggedErrorClass<OrganizationWorkspaceNotFound>()(
  "OrganizationWorkspaceNotFound",
  { status: Schema.Literal(404), code: Schema.String },
) {}

type AccessFailure =
  | OrganizationWorkspaceAccessDenied
  | OrganizationWorkspaceNotFound
  | ReauthenticationRequired;

export class OrganizationWorkspaceAuthorization extends Context.Service<
  OrganizationWorkspaceAuthorization,
  {
    readonly identity: Effect.Effect<
      OrganizationWorkspaceIdentity,
      OrganizationWorkspaceAccessDenied
    >;
    readonly requireGuild: (options: {
      readonly guildId: string;
      readonly allOf?: ReadonlyArray<PermissionValue>;
      readonly anyOf?: ReadonlyArray<PermissionValue>;
    }) => Effect.Effect<OrganizationWorkspaceGuildAccess, AccessFailure>;
  }
>()("@lootlog/api/http-api/organization-workspace/authorization") {}

const identity = Effect.flatMap(
  OrganizationWorkspaceAuthorization,
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
  Effect.flatMap(OrganizationWorkspaceAuthorization, (authorization) =>
    authorization.requireGuild({
      guildId,
      ...(Array.isArray(permissions) ? { allOf: permissions } : permissions),
    }),
  );

const data = <A>(
  operation: (
    service: OrganizationWorkspaceData["Service"],
  ) => Effect.Effect<A, OrganizationWorkspaceOperationError>,
) => Effect.flatMap(OrganizationWorkspaceData, operation);

const myReservationsData = <A>(
  operation: (
    service: MyReservationsData["Service"],
  ) => Effect.Effect<A, OrganizationWorkspaceOperationError>,
) => Effect.flatMap(MyReservationsData, operation);

const readData = <A>(
  operation: (
    service: ReservationReadData["Service"],
  ) => Effect.Effect<A, OrganizationWorkspaceOperationError>,
) => Effect.flatMap(ReservationReadData, operation);

const rolesData = <A>(
  operation: (
    service: RolesData["Service"],
  ) => Effect.Effect<A, OrganizationWorkspaceOperationError>,
) => Effect.flatMap(RolesData, operation);

const sharingData = <A>(
  operation: (
    service: ReservationSharingData["Service"],
  ) => Effect.Effect<A, OrganizationWorkspaceOperationError>,
) => Effect.flatMap(ReservationSharingData, operation);

const toViewer = (
  access: OrganizationWorkspaceGuildAccess,
): ReservationViewerContext => ({
  guildId: access.guildId,
  userId: access.userId,
  discordId: access.discordId,
  permissions: [...access.permissions],
});

const decode = <A, I, R>(schema: Schema.Codec<A, I, R>, value: unknown) =>
  Schema.decodeUnknownEffect(schema)(value).pipe(
    Effect.mapError(
      (cause) => new OrganizationWorkspaceOperationError({ cause }),
    ),
  );

type OrganizationWorkspaceFailure =
  | OrganizationWorkspaceAccessDenied
  | OrganizationWorkspaceNotFound
  | OrganizationWorkspaceOperationError
  | ReauthenticationRequired;

export const toOrganizationWorkspaceHttpResponse = <A, R>(
  effect: Effect.Effect<A, OrganizationWorkspaceFailure, R>,
) =>
  Effect.catchTags(effect, {
    OrganizationWorkspaceAccessDenied: statusCodeResponse,
    ReauthenticationRequired: reauthenticationRequiredResponse,
    OrganizationWorkspaceNotFound: statusCodeResponse,
    OrganizationWorkspaceOperationError: ({ cause }) => {
      if (Schema.is(ApplicationError)(cause)) {
        const status = applicationErrorStatus(cause);

        if (status < 500) return applicationErrorResponse(cause);
      }

      return Effect.die(cause);
    },
  });

const toDeclaredOrganizationWorkspaceError = <A, R>(
  effect: Effect.Effect<A, OrganizationWorkspaceFailure, R>,
  statuses: ReadonlyArray<number>,
) =>
  Effect.catchTags(effect, {
    OrganizationWorkspaceAccessDenied: (error) =>
      statuses.includes(error.status)
        ? Effect.fail(undefined)
        : Effect.die(error),
    ReauthenticationRequired: reauthenticationRequiredResponse,
    OrganizationWorkspaceNotFound: (error) =>
      statuses.includes(error.status)
        ? Effect.fail(undefined)
        : Effect.die(error),
    OrganizationWorkspaceOperationError: (error) =>
      statuses.includes(applicationErrorStatusOrUndefined(error.cause) ?? 0)
        ? Effect.fail(undefined)
        : Effect.die(error.cause),
  });

export const listReservationSpots = Effect.fn("listReservationSpots")(
  function* (guildId: string) {
    const access = yield* requireGuild(guildId, [
      Permission.LOOTLOG_RESERVATIONS_READ,
    ]);

    const value = yield* readData((service) =>
      service.listSpots(toViewer(access)),
    );

    return yield* decode(ReservationSpotsBoundary, value);
  },
);

export const listSpotReservations = Effect.fn("listSpotReservations")(
  function* (guildId: string, spotId: string, query: ReservationWindowQuery) {
    const access = yield* requireGuild(guildId, [
      Permission.LOOTLOG_RESERVATIONS_READ,
    ]);

    const value = yield* readData((service) =>
      service.listWindow(toViewer(access), spotId, query.from, query.to),
    );

    return yield* decode(ReservationWindowBoundary, value);
  },
);

export const createReservation = Effect.fn("createReservation")(function* (
  guildId: string,
  spotId: string,
  payload: CreateReservationRequest,
) {
  const access = yield* requireGuild(guildId, [
    Permission.LOOTLOG_RESERVATIONS_READ,
    Permission.LOOTLOG_RESERVATIONS_WRITE,
  ]);

  const value = yield* data((service) =>
    service.create(toViewer(access), spotId, payload),
  );

  return yield* decode(ReservationBoundary, value);
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

const setReservationSpotPin = Effect.fn("setReservationSpotPin")(function* (
  guildId: string,
  spotId: string,
  pinned: boolean,
) {
  const access = yield* requireGuild(guildId, [
    Permission.LOOTLOG_RESERVATIONS_READ,
  ]);

  yield* readData((service) =>
    pinned
      ? service.pinSpot(access.userId, access.guildId, spotId)
      : service.unpinSpot(access.userId, access.guildId, spotId),
  );
});

export const pinReservationSpot = (guildId: string, spotId: string) =>
  setReservationSpotPin(guildId, spotId, true);

export const unpinReservationSpot = (guildId: string, spotId: string) =>
  setReservationSpotPin(guildId, spotId, false);

export const listMyReservations = Effect.fn("listMyReservations")(function* (
  query: MyReservationsQuery,
) {
  const current = yield* identity;

  const value = yield* myReservationsData((service) =>
    service.listMine(current, query),
  );

  return yield* decode(MyReservationsBoundary, value);
});

export const deleteMyReservation = Effect.fn("deleteMyReservation")(function* (
  reservationId: number,
) {
  const current = yield* identity;
  yield* data((service) => service.deleteOwned(current, reservationId));
});

export const updateMyReservation = Effect.fn("updateMyReservation")(function* (
  reservationId: number,
  payload: UpdateReservationRequest,
) {
  const current = yield* identity;

  const value = yield* data((service) =>
    service.updateOwned(current, reservationId, payload),
  );

  return yield* decode(ReservationBoundary, value);
});

export const updateGuildRole = Effect.fn("RolesControllerUpdateGuildRole")(
  function* (
    guildId: string,
    roleId: string,
    payload: UpdateRolePermissionsRequest,
  ) {
    const access = yield* requireGuild(guildId, {
      anyOf: AccessRequirement.ADMINISTER,
    });

    const value = yield* rolesData((service) =>
      service.updateRole(access.discordId, access.guildId, roleId, payload),
    );

    return yield* decode(RoleResponse, value);
  },
);

const getGuildRoles = Effect.fn("RolesControllerGetGuildRoles")(function* (
  guildId: string,
) {
  const access = yield* requireGuild(guildId, [Permission.LOOTLOG_ACCESS]);

  const value = yield* rolesData((service) => service.getRoles(access.guildId));

  return yield* decode(RolesResponse, value);
});

const requireSharingAdmin = (guildId: string) =>
  requireGuild(guildId, { anyOf: AccessRequirement.ADMINISTER });

export const listReservationShares = Effect.fn("listReservationShares")(
  function* (guildId: string) {
    const access = yield* requireSharingAdmin(guildId);

    const value = yield* sharingData((service) =>
      service.listShares(access.guildId),
    );

    return yield* decode(ReservationSharesBoundary, value);
  },
);

export const previewReservationShareInvitation = Effect.fn(
  "previewReservationShareInvitation",
)(function* (token: string) {
  const current = yield* identity;

  const value = yield* sharingData((service) =>
    service.previewInvitation(token, current.discordId),
  );

  return yield* decode(ReservationShareInvitationPreviewBoundary, value);
});

export const acceptReservationShareInvitation = Effect.fn(
  "acceptReservationShareInvitation",
)(function* (token: string, payload: AcceptReservationShareInvitationRequest) {
  const current = yield* identity;

  const value = yield* sharingData((service) =>
    service.acceptInvitation(token, payload, current),
  );

  return yield* decode(AcceptedReservationShareBoundary, value);
});

export const createReservationShareInvitation = Effect.fn(
  "createReservationShareInvitation",
)(function* (guildId: string) {
  const access = yield* requireSharingAdmin(guildId);

  const value = yield* sharingData((service) =>
    service.createInvitation(access.guildId, access.userId),
  );

  return yield* decode(CreatedReservationShareInvitationBoundary, value);
});

export const revokeReservationShareInvitation = Effect.fn(
  "revokeReservationShareInvitation",
)(function* (guildId: string, invitationId: string) {
  const access = yield* requireSharingAdmin(guildId);
  yield* sharingData((service) =>
    service.revokeInvitation(access.guildId, invitationId),
  );
});

export const revokeReservationShare = Effect.fn("revokeReservationShare")(
  function* (guildId: string, shareId: string) {
    const access = yield* requireSharingAdmin(guildId);
    yield* sharingData((service) =>
      service.revokeShare(access.guildId, shareId),
    );
  },
);

export const getGuildRolesFromPath = (guildId: string | undefined) =>
  toDeclaredOrganizationWorkspaceError(
    Effect.flatMap(pathString(guildId, "guildId"), getGuildRoles),
    [403],
  );

export const updateGuildRoleFromPath = (
  guildId: string | undefined,
  roleId: string,
  payload: UpdateRolePermissionsRequest,
) =>
  toDeclaredOrganizationWorkspaceError(
    Effect.flatMap(pathString(guildId, "guildId"), (decodedGuildId) =>
      updateGuildRole(decodedGuildId, roleId, payload),
    ),
    [403, 404],
  );
