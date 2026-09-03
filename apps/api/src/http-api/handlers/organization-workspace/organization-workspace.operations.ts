import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Clock, Context, Effect, Layer, Schema } from "effect";
import { encodeDomainJson } from "../../domain-json.schema.js";
import { Capability, createAccessPolicy } from "@lootlog/domain/access-policy";
import {
  Permission,
  type Permission as PermissionValue,
} from "@lootlog/schema/permissions";
import type { ReservationViewerContext } from "#src/reservations/reservation-viewer";
import {
  and,
  arrayOverlaps,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  lt,
  or,
} from "drizzle-orm";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  guildTable,
  memberTable,
  memberToRoleTable,
  reservationTable,
  roleTable,
  userSettingsTable,
} from "#src/database/drizzle/schema";
import { presentReservation } from "#src/reservations/reservation-presentation";
import {
  applicationErrorStatusOrUndefined,
  PermissionDeniedError,
  ResourceNotFoundError,
} from "#src/shared/http/http-errors";
import { getPermissionsCachePattern } from "#src/shared/cache";
import {
  AcceptReservationShareInvitation201,
  CreateReservationShareInvitation201,
  ListReservationShares200,
  PreviewReservationShareInvitation200,
  type AcceptReservationShareInvitationDto,
} from "../../contracts/reservation-sharing/schemas.js";
import {
  CreateReservation201,
  ListMyReservations200,
  ListReservationSpots200,
  ListSpotReservations200,
  UpdateMyReservation200,
  type CreateReservationDto,
  type ListMyReservationsQuery,
  type ListSpotReservationsQuery,
  type UpdateReservationDto,
} from "../../contracts/reservations/schemas.js";
import {
  RolesControllerGetGuildRoles200,
  RolesControllerUpdateGuildRole200,
  type UpdateRolePermissionsDto,
} from "../../contracts/roles/schemas.js";

export type OrganizationWorkspaceIdentity = {
  readonly userId: string;
  readonly discordId: string;
};

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

export class OrganizationWorkspaceOperationError extends TaggedErrorClass<OrganizationWorkspaceOperationError>()(
  "OrganizationWorkspaceOperationError",
  { cause: Schema.Defect() },
) {}

type AccessFailure =
  | OrganizationWorkspaceAccessDenied
  | OrganizationWorkspaceNotFound;

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

type DataEffect = Effect.Effect<unknown, OrganizationWorkspaceOperationError>;

export class OrganizationWorkspaceData extends Context.Service<
  OrganizationWorkspaceData,
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
    readonly deleteOwned: (
      identity: OrganizationWorkspaceIdentity,
      reservationId: number,
    ) => DataEffect;
    readonly updateOwned: (
      identity: OrganizationWorkspaceIdentity,
      reservationId: number,
      payload: UpdateReservationDto,
    ) => DataEffect;
  }
>()("@lootlog/api/http-api/organization-workspace/data") {}

export class MyReservationsData extends Context.Service<
  MyReservationsData,
  {
    readonly listMine: (
      identity: OrganizationWorkspaceIdentity,
      query: ListMyReservationsQuery,
    ) => DataEffect;
  }
>()("@lootlog/api/http-api/my-reservations/data") {
  static readonly layerDatabase = Layer.effect(
    MyReservationsData,
    Effect.map(ApiDatabase, (database) =>
      MyReservationsData.of({
        listMine: ({ userId, discordId }, query) =>
          Effect.gen(function* () {
            const [guildRows, preferenceRows] = yield* Effect.all(
              [
                database
                  .selectDistinct({ id: guildTable.id })
                  .from(guildTable)
                  .leftJoin(
                    memberTable,
                    and(
                      eq(memberTable.guildId, guildTable.id),
                      eq(memberTable.userId, discordId),
                      eq(memberTable.active, true),
                      isNotNull(memberTable.globalUserId),
                    ),
                  )
                  .leftJoin(
                    memberToRoleTable,
                    eq(memberToRoleTable.A, memberTable.id),
                  )
                  .leftJoin(roleTable, eq(memberToRoleTable.B, roleTable.id))
                  .where(
                    and(
                      eq(guildTable.active, true),
                      or(
                        eq(guildTable.ownerId, discordId),
                        arrayOverlaps(roleTable.permissions, [
                          Permission.LOOTLOG_ACCESS,
                        ]),
                      ),
                    ),
                  ),
                database
                  .select({ guildsOrder: userSettingsTable.guildsOrder })
                  .from(userSettingsTable)
                  .where(eq(userSettingsTable.userId, userId))
                  .limit(1),
              ],
              { concurrency: "unbounded" },
            );
            if (guildRows.length === 0) return { items: [] };
            const guildOrder = new Map(
              (preferenceRows[0]?.guildsOrder ?? []).map((id, index) => [
                id,
                index,
              ]),
            );
            const guildIds = guildRows
              .map(({ id }) => id)
              .sort(
                (left, right) =>
                  (guildOrder.get(left) ?? Number.MAX_SAFE_INTEGER) -
                  (guildOrder.get(right) ?? Number.MAX_SAFE_INTEGER),
              );
            const now = new Date(yield* Clock.currentTimeMillis);
            const timeCondition =
              query.status === "past"
                ? and(
                    gte(
                      reservationTable.endsAt,
                      new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
                    ),
                    lt(reservationTable.endsAt, now),
                  )
                : gte(reservationTable.endsAt, now);
            const rows = yield* database
              .select({ reservation: reservationTable, guild: guildTable })
              .from(reservationTable)
              .innerJoin(
                guildTable,
                eq(guildTable.id, reservationTable.guildId),
              )
              .where(
                and(
                  inArray(reservationTable.guildId, guildIds),
                  timeCondition,
                  or(
                    eq(reservationTable.createdByUserId, userId),
                    eq(reservationTable.legacyCreatedByDiscordId, discordId),
                  ),
                ),
              )
              .orderBy(
                query.status === "past"
                  ? desc(reservationTable.endsAt)
                  : asc(reservationTable.startsAt),
                query.status === "past"
                  ? desc(reservationTable.id)
                  : asc(reservationTable.id),
              );
            const viewer = {
              guildId: null,
              userId,
              discordId,
              canModerateCurrentGuild: false,
            };
            return {
              items: rows.map(({ reservation, guild }) =>
                presentReservation({ ...reservation, guild }, viewer),
              ),
            };
          }).pipe(
            Effect.withSpan("listMyReservations.persistence", {
              attributes: { adapter: "ApiDatabase", retryCount: 0 },
            }),
            Effect.mapError(
              (cause) => new OrganizationWorkspaceOperationError({ cause }),
            ),
          ),
      }),
    ),
  );
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
>()("@lootlog/api/http-api/reservation-read/data") {}

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
      identity: OrganizationWorkspaceIdentity,
    ) => DataEffect;
  }
>()("@lootlog/api/http-api/reservation-sharing/data") {}

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
  static layerDatabase(cache: RolesCache) {
    return Layer.effect(
      RolesData,
      Effect.map(ApiDatabase, (database) => {
        const operation = <A, E>(effect: Effect.Effect<A, E>) =>
          effect.pipe(
            Effect.mapError(
              (cause) => new OrganizationWorkspaceOperationError({ cause }),
            ),
          );

        return RolesData.of({
          getRoles: (guildId) =>
            operation(
              database
                .select()
                .from(roleTable)
                .where(eq(roleTable.guildId, guildId))
                .orderBy(desc(roleTable.position)),
            ),
          updateRole: (discordId, guildId, roleId, payload) =>
            operation(
              Effect.gen(function* () {
                const roles = yield* database
                  .select()
                  .from(roleTable)
                  .where(
                    and(
                      eq(roleTable.id, roleId),
                      eq(roleTable.guildId, guildId),
                    ),
                  )
                  .limit(1);
                const role = roles[0];
                if (!role)
                  return yield* Effect.fail(new ResourceNotFoundError());

                const owners = yield* database
                  .select({ ownerId: guildTable.ownerId })
                  .from(guildTable)
                  .where(eq(guildTable.id, guildId))
                  .limit(1);
                const roleIsAdministrative = createAccessPolicy({
                  capabilities: role.permissions,
                }).allows(Capability.ADMIN);
                const newPermissionsAreAdministrative = createAccessPolicy({
                  capabilities: payload.permissions,
                }).allows(Capability.ADMIN);
                if (
                  roleIsAdministrative !== newPermissionsAreAdministrative &&
                  owners[0]?.ownerId !== discordId
                ) {
                  return yield* Effect.fail(new PermissionDeniedError());
                }

                const updated = yield* database
                  .update(roleTable)
                  .set({
                    permissions: [...payload.permissions],
                    lvlRangeFrom: payload.lvlRangeFrom,
                    lvlRangeTo: payload.lvlRangeTo,
                    updatedAt: new Date(yield* Clock.currentTimeMillis),
                  })
                  .where(
                    and(
                      eq(roleTable.id, roleId),
                      eq(roleTable.guildId, guildId),
                    ),
                  )
                  .returning();
                yield* cache.deleteByPattern(
                  getPermissionsCachePattern(guildId),
                );
                return updated[0] ?? null;
              }).pipe(
                Effect.withSpan("roles.update.persistence", {
                  attributes: { adapter: "ApiDatabase", retryCount: 0 },
                }),
              ),
            ),
        });
      }),
    );
  }
}

export interface RolesCache {
  readonly deleteByPattern: (pattern: string) => Effect.Effect<void, unknown>;
}

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
  actorIsOwner: access.ownerId === access.discordId,
  permissions: [...access.permissions],
});

const decode = <A, I, R>(schema: Schema.Codec<A, I, R>, value: unknown) =>
  encodeDomainJson(value).pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(schema)),
    Effect.mapError(
      (cause) => new OrganizationWorkspaceOperationError({ cause }),
    ),
  );

type OrganizationWorkspaceFailure =
  | OrganizationWorkspaceAccessDenied
  | OrganizationWorkspaceNotFound
  | OrganizationWorkspaceOperationError;

export const toOrganizationWorkspaceHttpResponse = <A, R>(
  effect: Effect.Effect<A, OrganizationWorkspaceFailure, R>,
) =>
  Effect.catchTags(effect, {
    OrganizationWorkspaceAccessDenied: Effect.die,
    OrganizationWorkspaceNotFound: Effect.die,
    OrganizationWorkspaceOperationError: (error) => Effect.die(error.cause),
  });

export const toDeclaredOrganizationWorkspaceError = <A, R>(
  effect: Effect.Effect<A, OrganizationWorkspaceFailure, R>,
  statuses: ReadonlyArray<number>,
) =>
  Effect.catchTags(effect, {
    OrganizationWorkspaceAccessDenied: (error) =>
      statuses.includes(error.status)
        ? Effect.fail(undefined)
        : Effect.die(error),
    OrganizationWorkspaceNotFound: (error) =>
      statuses.includes(error.status)
        ? Effect.fail(undefined)
        : Effect.die(error),
    OrganizationWorkspaceOperationError: (error) =>
      statuses.includes(applicationErrorStatusOrUndefined(error.cause) ?? 0)
        ? Effect.fail(undefined)
        : Effect.die(error.cause),
  });

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

export const listSpotReservations = Effect.fn("listSpotReservations")(
  function* (
    guildId: string,
    spotId: string,
    query: ListSpotReservationsQuery,
  ) {
    const access = yield* requireGuild(guildId, [
      Permission.LOOTLOG_RESERVATIONS_READ,
    ]);
    const value = yield* readData((service) =>
      service.listWindow(toViewer(access), spotId, query.from, query.to),
    );
    return yield* decode(ListSpotReservations200, value);
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
  query: ListMyReservationsQuery,
) {
  const current = yield* identity;
  const value = yield* myReservationsData((service) =>
    service.listMine(current, query),
  );
  return yield* decode(ListMyReservations200, value);
});

export const deleteMyReservation = Effect.fn("deleteMyReservation")(function* (
  reservationId: number,
) {
  const current = yield* identity;
  yield* data((service) => service.deleteOwned(current, reservationId));
});

export const updateMyReservation = Effect.fn("updateMyReservation")(function* (
  reservationId: number,
  payload: UpdateReservationDto,
) {
  const current = yield* identity;
  const value = yield* data((service) =>
    service.updateOwned(current, reservationId, payload),
  );
  return yield* decode(UpdateMyReservation200, value);
});

export const updateGuildRole = Effect.fn("RolesControllerUpdateGuildRole")(
  function* (
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
  },
);

export const getGuildRoles = Effect.fn("RolesControllerGetGuildRoles")(
  function* (guildId: string) {
    const access = yield* requireGuild(guildId, [Permission.LOOTLOG_ACCESS]);
    const value = yield* rolesData((service) =>
      service.getRoles(access.guildId),
    );
    return yield* decode(RolesControllerGetGuildRoles200, value);
  },
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

export const createReservationShareInvitation = Effect.fn(
  "createReservationShareInvitation",
)(function* (guildId: string) {
  const access = yield* requireSharingAdmin(guildId);
  const value = yield* sharingData((service) =>
    service.createInvitation(access.guildId, access.userId),
  );
  return yield* decode(CreateReservationShareInvitation201, value);
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

export const getGuildRolesFromPath = (guildId: unknown) =>
  toDeclaredOrganizationWorkspaceError(
    Effect.flatMap(pathString(guildId, "guildId"), getGuildRoles),
    [403],
  );

export const updateGuildRoleFromPath = (
  guildId: unknown,
  roleId: string,
  payload: UpdateRolePermissionsDto,
) =>
  toDeclaredOrganizationWorkspaceError(
    Effect.flatMap(pathString(guildId, "guildId"), (decodedGuildId) =>
      updateGuildRole(decodedGuildId, roleId, payload),
    ),
    [403, 404],
  );
