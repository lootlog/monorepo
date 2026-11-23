import { AccessRequirement } from "@lootlog/domain/access-policy";
import { describe, expect, it } from "bun:test";
import { Effect, Schema } from "effect";
import { Permission } from "@lootlog/schema/permissions";
import {
  PermissionDeniedError,
  ResourceNotFoundError,
} from "@lootlog/protocol/http/errors";
import { ReservationResponse } from "#src/contracts/reservations/schemas";
import { ReservationSharesResponse } from "#src/contracts/reservation-sharing/schemas";
import { RoleResponse } from "#src/contracts/roles/schemas";
import { OrganizationWorkspaceOperationError } from "#src/guilds/organization-workspace-access";
import {
  createReservation,
  listReservationSpots,
} from "../handlers/reservations/reservations.handlers.js";
import {
  acceptReservationShareInvitation,
  listReservationShares,
  previewReservationShareInvitation,
} from "../handlers/reservation-sharing/reservation-sharing.handlers.js";
import { updateGuildRole } from "../handlers/roles/roles.handlers.js";
import {
  OrganizationWorkspaceAccessDenied,
  OrganizationWorkspaceNotFound,
} from "./organization-workspace.access.js";
import {
  identity,
  guildAccess,
  reservation,
  role,
  sharingList,
  makeData,
  makeReadData,
  makeSharingData,
  makeRolesData,
  makeAuthorization,
  provideServices,
} from "./organization-workspace.access.fixtures.js";

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
        permissions: guildAccess.permissions,
      },
    ]);
    expect(response.startsAt).toBe("2026-09-03T10:00:00.000Z");
    expect(Schema.is(ReservationResponse)(response)).toBe(true);
  });

  it("fails closed before reservation data access when authorization fails", async () => {
    const denied = new OrganizationWorkspaceAccessDenied({
      status: 403,
      code: "RESERVATIONS_READ_REQUIRED",
    });

    let dataCalled = false;

    const layer = provideServices(
      makeAuthorization({ requireGuild: () => Effect.fail(denied) }),
      makeData(),
      makeRolesData(),
      makeSharingData(),
      makeReadData({
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
    const hidden = new OrganizationWorkspaceNotFound({
      status: 404,
      code: "RESERVATION_NOT_FOUND",
    });

    let dataCalled = false;

    const layer = provideServices(
      makeAuthorization({ requireGuild: () => Effect.fail(hidden) }),
      makeData(),
      makeRolesData(),
      makeSharingData(),
      makeReadData({
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
    const authorizationCalls: Array<ReadonlyArray<string> | undefined> = [];

    const updateCalls: Array<{
      discordId: string;
      guildId: string;
      roleId: string;
    }> = [];

    const layer = provideServices(
      makeAuthorization({
        requireGuild: (options) => {
          authorizationCalls.push(options.anyOf);

          return Effect.succeed(guildAccess);
        },
      }),
      makeData(),
      makeRolesData({
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

    expect(authorizationCalls).toEqual([AccessRequirement.ADMINISTER]);
    expect(updateCalls).toEqual([
      {
        discordId: identity.discordId,
        guildId: "guild-a",
        roleId: role.id,
      },
    ]);
    expect(Schema.is(RoleResponse)(response)).toBe(true);
  });

  it("preserves the role service rejection for non-owner admin-bit changes", async () => {
    const serviceForbidden = new PermissionDeniedError("Forbidden");

    const failure = new OrganizationWorkspaceOperationError({
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
      makeData(),
      makeRolesData({ updateRole: () => Effect.fail(failure) }),
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
    expect(error).toHaveProperty("cause", serviceForbidden);
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
      makeData(),
      makeRolesData(),
      makeSharingData({
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
        anyOf: AccessRequirement.ADMINISTER,
      },
    ]);
    expect(guildIds).toEqual(["guild-a"]);
    expect(Schema.is(ReservationSharesResponse)(response)).toBe(true);
  });

  it("does not reveal sharing state for a hidden Organization", async () => {
    const hidden = new OrganizationWorkspaceNotFound({
      status: 404,
      code: "GUILD_NOT_FOUND",
    });

    let dataCalled = false;

    const layer = provideServices(
      makeAuthorization({ requireGuild: () => Effect.fail(hidden) }),
      makeData(),
      makeRolesData(),
      makeSharingData({
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
    const invitationNotFound = new ResourceNotFoundError({
      code: "INVITATION_NOT_FOUND",
    });

    const failure = new OrganizationWorkspaceOperationError({
      cause: invitationNotFound,
    });

    const layer = provideServices(
      makeAuthorization(),
      makeData(),
      makeRolesData(),
      makeSharingData({ previewInvitation: () => Effect.fail(failure) }),
    );

    const error = await Effect.runPromise(
      Effect.flip(
        previewReservationShareInvitation("invalid-token").pipe(
          Effect.provide(layer),
        ),
      ),
    );

    expect(error).toBe(failure);
    expect(error).toHaveProperty("cause", invitationNotFound);
  });

  it("keeps an unauthorized target Organization hidden during invitation acceptance", async () => {
    const targetHidden = new ResourceNotFoundError({
      code: "TARGET_ORGANIZATION_NOT_FOUND",
    });

    const failure = new OrganizationWorkspaceOperationError({
      cause: targetHidden,
    });

    const acceptCalls: unknown[] = [];

    const layer = provideServices(
      makeAuthorization(),
      makeData(),
      makeRolesData(),
      makeSharingData({
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
