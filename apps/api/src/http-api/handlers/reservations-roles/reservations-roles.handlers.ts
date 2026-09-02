import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Context, Effect, Layer, Schema } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";
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
  ForbiddenException,
  NotFoundException,
} from "#src/shared/http/http-errors";
import { getPermissionsCachePattern } from "#src/shared/constants/cache.constant";
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

export class ReservationsRolesAccessDenied extends TaggedErrorClass<ReservationsRolesAccessDenied>()(
  "ReservationsRolesAccessDenied",
  { status: Schema.Literals([401, 403]), code: Schema.String },
) {}

export class ReservationsRolesNotFound extends TaggedErrorClass<ReservationsRolesNotFound>()(
  "ReservationsRolesNotFound",
  { status: Schema.Literal(404), code: Schema.String },
) {}

export class ReservationsRolesOperationError extends TaggedErrorClass<ReservationsRolesOperationError>()(
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
>()("@lootlog/api/http-api/reservations-roles/data") {}

export class MyReservationsData extends Context.Service<
  MyReservationsData,
  {
    readonly listMine: (
      identity: ReservationsRolesIdentity,
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
            const [guildRows, preferenceRows] = yield* Effect.all([
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
            ]);
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
            const now = new Date();
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
              (cause) => new ReservationsRolesOperationError({ cause }),
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
      identity: ReservationsRolesIdentity,
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
              (cause) => new ReservationsRolesOperationError({ cause }),
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
                if (!role) return yield* Effect.fail(new NotFoundException());

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
                  return yield* Effect.fail(new ForbiddenException());
                }

                const updated = yield* database
                  .update(roleTable)
                  .set({
                    permissions: [...payload.permissions],
                    lvlRangeFrom: payload.lvlRangeFrom,
                    lvlRangeTo: payload.lvlRangeTo,
                    updatedAt: new Date(),
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

const myReservationsData = <A>(
  operation: (
    service: MyReservationsData["Service"],
  ) => Effect.Effect<A, ReservationsRolesOperationError>,
) => Effect.flatMap(MyReservationsData, operation);

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
            const value = yield* myReservationsData((service) =>
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
          Effect.flatMap(pathString(params.guildId, "guildId"), getGuildRoles),
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
