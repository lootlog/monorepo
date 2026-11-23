import {
  ReservationBoundary,
  MyReservationsBoundary,
  ReservationWindowBoundary,
  ReservationSpotsBoundary,
  ReservationSharesBoundary,
  CreatedReservationShareInvitationBoundary,
  ReservationShareInvitationPreviewBoundary,
  AcceptedReservationShareBoundary,
} from "../handlers/reservations/reservation-response.schema.js";
import { decodeDomainJson } from "../domain-json.schema.js";
import { describe, expect, it } from "bun:test";
import { Effect, Exit, Schema } from "effect";
import {
  MyReservationsResponse,
  ReservationSpotsResponse,
  ReservationWindowResponse,
  ReservationResponse,
} from "#src/contracts/reservations/schemas";
import {
  AcceptedReservationShareResponse,
  CreatedReservationShareInvitationResponse,
  ReservationShareInvitationPreviewResponse,
  ReservationSharesResponse,
} from "#src/contracts/reservation-sharing/schemas";
import { RoleResponse } from "#src/contracts/roles/schemas";
import { OrganizationWorkspaceOperationError } from "#src/guilds/organization-workspace-access";
import { createReservation } from "../handlers/reservations/reservations.handlers.js";
import { updateGuildRole } from "../handlers/roles/roles.handlers.js";
import {
  reservation,
  role,
  share,
  sharingList,
  makeData,
  makeRolesData,
  makeAuthorization,
  provideServices,
} from "./organization-workspace.access.fixtures.js";

describe("organization workspace response boundaries", () => {
  const date = new Date("2026-09-03T10:00:00.000Z");

  const richReservation = {
    ...reservation,
    endsAt: "2026-09-03T10:30:00.000Z",
    editingConstraints: {
      ...reservation.editingConstraints,
      futureRule: { dates: [date, null], enabled: false },
    },
    privateField: "stripped",
  };

  const spot = {
    id: "titan-a",
    name: "Titan A",
    level: 300,
    images: [],
    maps: [],
    isPinned: false,
    isAvailableNow: true,
    availableUntil: date,
    activeReservationCount: 1,
    hasPartnerReservations: true,
    currentReservation: { ...richReservation, futureField: { date } },
    nextReservation: null,
  };

  const invitation = {
    id: "invite-a",
    createdAt: date,
    expiresAt: date,
    invitePath: "/reservation-sharing/invitations/token-a",
  };

  it("preserves dates, nullable values, open fields and stripping in reservation projections", () => {
    expect(
      Effect.runSync(Schema.decodeEffect(ReservationBoundary)(richReservation)),
    ).toEqual(
      Effect.runSync(decodeDomainJson(ReservationResponse, richReservation)),
    );
    const mine = { items: [richReservation] };
    expect(
      Effect.runSync(Schema.decodeEffect(MyReservationsBoundary)(mine)),
    ).toEqual(Effect.runSync(decodeDomainJson(MyReservationsResponse, mine)));
    const window = { ...mine, window: { from: date, to: date.toISOString() } };
    expect(
      Effect.runSync(Schema.decodeEffect(ReservationWindowBoundary)(window)),
    ).toEqual(
      Effect.runSync(decodeDomainJson(ReservationWindowResponse, window)),
    );
    expect(
      Effect.runSync(Schema.decodeEffect(ReservationSpotsBoundary)([spot])),
    ).toEqual(
      Effect.runSync(decodeDomainJson(ReservationSpotsResponse, [spot])),
    );
  });

  it.each([
    { ...spot, availableUntil: "2026-09-03T10:00:00+02:00" },
    { ...spot, currentReservation: undefined },
    {
      ...spot,
      nextReservation: { ...richReservation, futureField: undefined },
    },
    { ...spot, nextReservation: { ...richReservation, futureField: () => 1 } },
  ])("rejects malformed nullable and open reservation spot fields", (value) => {
    expect(
      Exit.isFailure(
        Effect.runSyncExit(decodeDomainJson(ReservationSpotsResponse, [value])),
      ),
    ).toBe(true);
    expect(
      Exit.isFailure(
        Effect.runSyncExit(
          Schema.decodeUnknownEffect(ReservationSpotsBoundary)([value]),
        ),
      ),
    ).toBe(true);
  });

  it("preserves sharing list and invitation response projections", () => {
    const shares = { ...sharingList, pendingInvitations: [invitation] };
    expect(
      Effect.runSync(Schema.decodeEffect(ReservationSharesBoundary)(shares)),
    ).toEqual(
      Effect.runSync(decodeDomainJson(ReservationSharesResponse, shares)),
    );
    expect(
      Effect.runSync(
        Schema.decodeEffect(CreatedReservationShareInvitationBoundary)(
          invitation,
        ),
      ),
    ).toEqual(
      Effect.runSync(
        decodeDomainJson(CreatedReservationShareInvitationResponse, invitation),
      ),
    );

    const preview = {
      sourceOrganization: share.partner,
      expiresAt: date,
      eligibleTargetOrganizations: [],
    };

    expect(
      Effect.runSync(
        Schema.decodeEffect(ReservationShareInvitationPreviewBoundary)(preview),
      ),
    ).toEqual(
      Effect.runSync(
        decodeDomainJson(ReservationShareInvitationPreviewResponse, preview),
      ),
    );
    expect(
      Effect.runSync(
        Schema.decodeEffect(AcceptedReservationShareBoundary)(share),
      ),
    ).toEqual(
      Effect.runSync(decodeDomainJson(AcceptedReservationShareResponse, share)),
    );
  });

  it("rejects a malformed reservation date at the response boundary", () => {
    expect(
      Exit.isFailure(
        Effect.runSyncExit(
          decodeDomainJson(ReservationResponse, {
            ...reservation,
            startsAt: "2026-02-30T10:00:00.000Z",
          }),
        ),
      ),
    ).toBe(true);
  });

  const constraintsWithFunction = {
    ...reservation.editingConstraints,
    bad: () => 1,
  };

  it.each([
    { ...reservation, endsAt: new Date(Number.NaN) },
    { ...reservation, id: 1.5 },
    {
      ...reservation,
      editingConstraints: {
        ...reservation.editingConstraints,
        reservationMaxAdvanceDays: 0,
      },
    },
    { ...reservation, editingConstraints: constraintsWithFunction },
  ])(
    "keeps malformed reservation output as an operation error",
    async (value) => {
      expect(
        Exit.isFailure(
          Effect.runSyncExit(decodeDomainJson(ReservationResponse, value)),
        ),
      ).toBe(true);

      const layer = provideServices(
        makeAuthorization(),
        makeData({ create: () => Effect.succeed(value) }),
      );

      const error = await Effect.runPromise(
        Effect.flip(
          createReservation("guild-a", "titan-a", {
            startsAt: date.toISOString(),
            endsAt: date.toISOString(),
          }).pipe(Effect.provide(layer)),
        ),
      );

      expect(error).toBeInstanceOf(OrganizationWorkspaceOperationError);
    },
  );

  it("still rejects invalid role fields while stripping database metadata", async () => {
    const value = { ...role, position: null };

    const layer = provideServices(
      makeAuthorization(),
      makeData(),
      makeRolesData({ updateRole: () => Effect.succeed(value) }),
    );

    const response = await Effect.runPromise(
      updateGuildRole("guild-a", role.id, {
        permissions: [],
        lvlRangeFrom: 1,
        lvlRangeTo: 300,
      }).pipe(Effect.provide(layer)),
    );

    expect(response).toEqual(
      Effect.runSync(decodeDomainJson(RoleResponse, value)),
    );

    const invalid = provideServices(
      makeAuthorization(),
      makeData(),
      makeRolesData({
        updateRole: () => Effect.succeed({ ...role, color: Number.NaN }),
      }),
    );

    const error = await Effect.runPromise(
      Effect.flip(
        updateGuildRole("guild-a", role.id, {
          permissions: [],
          lvlRangeFrom: 1,
          lvlRangeTo: 300,
        }).pipe(Effect.provide(invalid)),
      ),
    );

    expect(error).toBeInstanceOf(OrganizationWorkspaceOperationError);
  });
});
