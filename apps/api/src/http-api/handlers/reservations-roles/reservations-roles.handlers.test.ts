import { describe, expect, it } from "bun:test";
import { Effect, Layer, Schema } from "effect";
import { Permission } from "@lootlog/schema/permissions";
import {
  ReservationResponseDto,
  ReservationSharesResponseDto,
  RoleResponseDto_Output,
} from "../../lootlog-api.generated.js";
import {
  acceptReservationShareInvitation,
  createReservation,
  listReservationSpots,
  listReservationShares,
  previewReservationShareInvitation,
  ReservationsRolesAccessDenied,
  ReservationsRolesAuthorization,
  ReservationsRolesData,
  ReservationsRolesNotFound,
  ReservationsRolesOperationError,
  updateGuildRole,
} from "./reservations-roles.handlers.js";

const identity = { userId: "user-a", discordId: "discord-owner" };
const guildAccess = {
  ...identity,
  guildId: "guild-a",
  ownerId: identity.discordId,
  permissions: [
    Permission.LOOTLOG_ACCESS,
    Permission.LOOTLOG_RESERVATIONS_READ,
    Permission.LOOTLOG_RESERVATIONS_WRITE,
    Permission.ADMIN,
  ],
};

const reservation = {
  id: 41,
  spotId: "titan-a",
  spotName: "Titan A",
  startsAt: new Date("2026-09-03T10:00:00.000Z"),
  endsAt: new Date("2026-09-03T10:30:00.000Z"),
  comment: null,
  createdAt: new Date("2026-09-02T10:00:00.000Z"),
  author: { displayName: "Owner", avatarUrl: null },
  sourceOrganization: {
    name: "Guild A",
    iconUrl: null,
    isCurrent: true,
    calendarPath: "/guild-a/reservations/titan-a",
  },
  isMine: true,
  canEdit: true,
  canCancel: true,
  editingConstraints: {
    reservationMaxDurationMinutes: 120,
    reservationMinDurationMinutes: 15,
    reservationTimeGranularityMinutes: 15,
    reservationMaxAdvanceDays: 14,
  },
  reminderMinutesBefore: 15 as const,
};

const role = {
  id: "role-a",
  guildId: "guild-a",
  name: "Admins",
  color: null,
  position: 1,
  permissions: [Permission.ADMIN],
  lvlRangeFrom: 1,
  lvlRangeTo: 300,
};

const sharingList = {
  shares: [
    {
      id: "share-a",
      partner: { name: "Partner Guild", iconUrl: null },
      createdAt: new Date("2026-09-02T12:00:00.000Z"),
    },
  ],
  pendingInvitations: [],
};

const makeData = (overrides: Partial<ReservationsRolesData["Service"]> = {}) =>
  ReservationsRolesData.of({
    listSpots: () => Effect.succeed([]),
    listWindow: () => Effect.succeed({ items: [], window: {} }),
    create: () => Effect.succeed(reservation),
    deleteVisible: () => Effect.succeed(undefined),
    pinSpot: () => Effect.succeed(undefined),
    unpinSpot: () => Effect.succeed(undefined),
    listMine: () => Effect.succeed({ items: [] }),
    deleteOwned: () => Effect.succeed(undefined),
    updateOwned: () => Effect.succeed(reservation),
    getRoles: () => Effect.succeed([role]),
    updateRole: () => Effect.succeed(role),
    listShares: () => Effect.succeed({ shares: [], pendingInvitations: [] }),
    createInvitation: () => Effect.succeed({}),
    revokeInvitation: () => Effect.succeed(undefined),
    revokeShare: () => Effect.succeed(undefined),
    previewInvitation: () => Effect.succeed({}),
    acceptInvitation: () => Effect.succeed({}),
    ...overrides,
  });

const makeAuthorization = (
  overrides: Partial<ReservationsRolesAuthorization["Service"]> = {},
) =>
  ReservationsRolesAuthorization.of({
    identity: Effect.succeed(identity),
    requireGuild: () => Effect.succeed(guildAccess),
    ...overrides,
  });

const provideServices = (
  authorization: ReservationsRolesAuthorization["Service"],
  data: ReservationsRolesData["Service"],
) =>
  Layer.merge(
    Layer.succeed(ReservationsRolesAuthorization, authorization),
    Layer.succeed(ReservationsRolesData, data),
  );

describe("Reservations and Roles HttpApi handlers", () => {
  it("creates a reservation only after visibility and action authorization", async () => {
    const authorizationCalls: Array<{
      guildId: string;
      allOf?: ReadonlyArray<string>;
      anyOf?: ReadonlyArray<string>;
    }> = [];
    const createContexts: unknown[] = [];
    const layer = provideServices(
      makeAuthorization({
        requireGuild: (options) => {
          authorizationCalls.push(options);
          return Effect.succeed(guildAccess);
        },
      }),
      makeData({
        create: (context) => {
          createContexts.push(context);
          return Effect.succeed(reservation);
        },
      }),
    );

    const response = await Effect.runPromise(
      createReservation("guild-alias", "titan-a", {
        startsAt: "2026-09-03T10:00:00.000Z",
        endsAt: "2026-09-03T10:30:00.000Z",
        reminderMinutesBefore: 15,
      }).pipe(Effect.provide(layer)),
    );

    expect(authorizationCalls).toEqual([
      {
        guildId: "guild-alias",
        allOf: [
          Permission.LOOTLOG_RESERVATIONS_READ,
          Permission.LOOTLOG_RESERVATIONS_WRITE,
        ],
      },
    ]);
    expect(createContexts).toEqual([
      {
        guildId: "guild-a",
        userId: identity.userId,
        discordId: identity.discordId,
        actorIsOwner: true,
        permissions: guildAccess.permissions,
      },
    ]);
    expect(response.startsAt).toBe("2026-09-03T10:00:00.000Z");
    expect(Schema.is(ReservationResponseDto)(response)).toBe(true);
  });

  it("fails closed before reservation data access when authorization fails", async () => {
    const denied = new ReservationsRolesAccessDenied({
      status: 403,
      code: "RESERVATIONS_READ_REQUIRED",
    });
    let dataCalled = false;
    const layer = provideServices(
      makeAuthorization({ requireGuild: () => Effect.fail(denied) }),
      makeData({
        listSpots: () => {
          dataCalled = true;
          return Effect.succeed([]);
        },
      }),
    );

    const error = await Effect.runPromise(
      Effect.flip(listReservationSpots("guild-a").pipe(Effect.provide(layer))),
    );

    expect(error).toBe(denied);
    expect(dataCalled).toBe(false);
  });

  it("keeps a cross-Organization hidden reservation indistinguishable from not-found", async () => {
    const hidden = new ReservationsRolesNotFound({
      status: 404,
      code: "RESERVATION_NOT_FOUND",
    });
    let dataCalled = false;
    const layer = provideServices(
      makeAuthorization({ requireGuild: () => Effect.fail(hidden) }),
      makeData({
        listSpots: () => {
          dataCalled = true;
          return Effect.succeed([]);
        },
      }),
    );

    const error = await Effect.runPromise(
      Effect.flip(
        listReservationSpots("partner-guild").pipe(Effect.provide(layer)),
      ),
    );

    expect(error).toBe(hidden);
    expect(dataCalled).toBe(false);
  });

  it("passes OWNER identity and canonical Organization to role recovery", async () => {
    const authorizationCalls: Array<ReadonlyArray<string>> = [];
    const updateCalls: Array<{
      discordId: string;
      guildId: string;
      roleId: string;
    }> = [];
    const layer = provideServices(
      makeAuthorization({
        requireGuild: (options) => {
          authorizationCalls.push(options.allOf);
          return Effect.succeed(guildAccess);
        },
      }),
      makeData({
        updateRole: (discordId, guildId, roleId) => {
          updateCalls.push({ discordId, guildId, roleId });
          return Effect.succeed(role);
        },
      }),
    );

    const response = await Effect.runPromise(
      updateGuildRole("guild-alias", role.id, {
        permissions: [Permission.ADMIN],
        lvlRangeFrom: 1,
        lvlRangeTo: 300,
      }).pipe(Effect.provide(layer)),
    );

    expect(authorizationCalls).toEqual([
      [Permission.LOOTLOG_ACCESS, Permission.ADMIN],
    ]);
    expect(updateCalls).toEqual([
      {
        discordId: identity.discordId,
        guildId: "guild-a",
        roleId: role.id,
      },
    ]);
    expect(Schema.is(RoleResponseDto_Output)(response)).toBe(true);
  });

  it("preserves the role service rejection for non-owner admin-bit changes", async () => {
    const serviceForbidden = {
      getStatus: () => 403,
      message: "Forbidden",
    };
    const failure = new ReservationsRolesOperationError({
      cause: serviceForbidden,
    });
    const layer = provideServices(
      makeAuthorization({
        requireGuild: () =>
          Effect.succeed({
            ...guildAccess,
            discordId: "discord-admin",
          }),
      }),
      makeData({ updateRole: () => Effect.fail(failure) }),
    );

    const error = await Effect.runPromise(
      Effect.flip(
        updateGuildRole("guild-a", role.id, {
          permissions: [],
          lvlRangeFrom: 1,
          lvlRangeTo: 300,
        }).pipe(Effect.provide(layer)),
      ),
    );

    expect(error).toBe(failure);
    expect((error as ReservationsRolesOperationError).cause).toBe(
      serviceForbidden,
    );
  });

  it("lists reciprocal partner Organizations with OWNER-or-ADMIN authority", async () => {
    const authorizationCalls: unknown[] = [];
    const guildIds: string[] = [];
    const layer = provideServices(
      makeAuthorization({
        requireGuild: (options) => {
          authorizationCalls.push(options);
          return Effect.succeed(guildAccess);
        },
      }),
      makeData({
        listShares: (guildId) => {
          guildIds.push(guildId);
          return Effect.succeed(sharingList);
        },
      }),
    );

    const response = await Effect.runPromise(
      listReservationShares("guild-alias").pipe(Effect.provide(layer)),
    );

    expect(authorizationCalls).toEqual([
      {
        guildId: "guild-alias",
        anyOf: [Permission.OWNER, Permission.ADMIN],
      },
    ]);
    expect(guildIds).toEqual(["guild-a"]);
    expect(Schema.is(ReservationSharesResponseDto)(response)).toBe(true);
  });

  it("does not reveal sharing state for a hidden Organization", async () => {
    const hidden = new ReservationsRolesNotFound({
      status: 404,
      code: "GUILD_NOT_FOUND",
    });
    let dataCalled = false;
    const layer = provideServices(
      makeAuthorization({ requireGuild: () => Effect.fail(hidden) }),
      makeData({
        listShares: () => {
          dataCalled = true;
          return Effect.succeed(sharingList);
        },
      }),
    );

    const error = await Effect.runPromise(
      Effect.flip(
        listReservationShares("partner-hidden").pipe(Effect.provide(layer)),
      ),
    );

    expect(error).toBe(hidden);
    expect(dataCalled).toBe(false);
  });

  it("preserves invalid single-use invitation status and code", async () => {
    const invitationNotFound = {
      getStatus: () => 404,
      response: { code: "INVITATION_NOT_FOUND" },
    };
    const failure = new ReservationsRolesOperationError({
      cause: invitationNotFound,
    });
    const layer = provideServices(
      makeAuthorization(),
      makeData({ previewInvitation: () => Effect.fail(failure) }),
    );

    const error = await Effect.runPromise(
      Effect.flip(
        previewReservationShareInvitation("invalid-token").pipe(
          Effect.provide(layer),
        ),
      ),
    );

    expect(error).toBe(failure);
    expect((error as ReservationsRolesOperationError).cause).toBe(
      invitationNotFound,
    );
  });

  it("keeps an unauthorized target Organization hidden during invitation acceptance", async () => {
    const targetHidden = {
      getStatus: () => 404,
      response: { code: "TARGET_ORGANIZATION_NOT_FOUND" },
    };
    const failure = new ReservationsRolesOperationError({
      cause: targetHidden,
    });
    const acceptCalls: unknown[] = [];
    const layer = provideServices(
      makeAuthorization(),
      makeData({
        acceptInvitation: (token, payload, current) => {
          acceptCalls.push({ token, payload, current });
          return Effect.fail(failure);
        },
      }),
    );

    const error = await Effect.runPromise(
      Effect.flip(
        acceptReservationShareInvitation("valid-token", {
          targetGuildId: "guild-hidden",
        }).pipe(Effect.provide(layer)),
      ),
    );

    expect(error).toBe(failure);
    expect(acceptCalls).toEqual([
      {
        token: "valid-token",
        payload: { targetGuildId: "guild-hidden" },
        current: identity,
      },
    ]);
  });
});
