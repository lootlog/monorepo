import { Effect, Layer } from "effect";
import { Permission } from "@lootlog/schema/permissions";
import {
  OrganizationWorkspaceData,
  MyReservationsData,
  ReservationSharingData,
  ReservationReadData,
} from "#src/reservations/reservations-data";
import { RolesData } from "#src/guilds/roles-data";
import { OrganizationWorkspaceAuthorization } from "./organization-workspace.access.js";
import { ForwardAuthIdentity } from "#src/runtime/auth/forward-auth-identity";

export const identity = { userId: "user-a", discordId: "discord-owner" };

export const guildAccess = {
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

export const reservation = {
  id: 41,
  spotId: "titan-a",
  spotName: "Titan A",
  startsAt: new Date("2026-09-03T10:00:00.000Z"),
  endsAt: new Date("2026-09-03T10:30:00.000Z"),
  comment: null,
  createdAt: new Date("2026-09-02T10:00:00.000Z"),
  author: { userId: "user-1", displayName: "Owner", avatarUrl: null },
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

export const role = {
  id: "role-a",
  guildId: "guild-a",
  name: "Admins",
  color: null,
  position: 1,
  permissions: [Permission.ADMIN],
  lvlRangeFrom: 1,
  lvlRangeTo: 300,
  createdAt: new Date("2026-09-02T10:00:00.000Z"),
  updatedAt: new Date("2026-09-02T10:00:00.000Z"),
};

export const share = {
  id: "share-a",
  partner: { name: "Partner Guild", iconUrl: null },
  createdAt: new Date("2026-09-02T12:00:00.000Z"),
};

export const sharingList = { shares: [share], pendingInvitations: [] };

export const makeData = (
  overrides: Partial<OrganizationWorkspaceData["Service"]> = {},
) =>
  OrganizationWorkspaceData.of({
    create: () => Effect.succeed(reservation),
    deleteVisible: () => Effect.undefined,
    deleteOwned: () => Effect.undefined,
    updateOwned: () => Effect.succeed(reservation),
    ...overrides,
  });

export const makeReadData = (
  overrides: Partial<ReservationReadData["Service"]> = {},
) =>
  ReservationReadData.of({
    listSpots: () => Effect.succeed([]),
    listWindow: () =>
      Effect.succeed({
        items: [],
        window: { from: reservation.startsAt, to: reservation.endsAt },
      }),
    pinSpot: () => Effect.undefined,
    unpinSpot: () => Effect.undefined,
    ...overrides,
  });

export const makeSharingData = (
  overrides: Partial<ReservationSharingData["Service"]> = {},
) =>
  ReservationSharingData.of({
    listShares: () => Effect.succeed({ shares: [], pendingInvitations: [] }),
    createInvitation: () =>
      Effect.succeed({
        id: "invitation-a",
        invitePath: "/reservation-sharing/invitations/token-a",
        expiresAt: share.createdAt,
        createdAt: share.createdAt,
      }),
    revokeInvitation: () => Effect.undefined,
    revokeShare: () => Effect.undefined,
    previewInvitation: () =>
      Effect.succeed({
        sourceOrganization: share.partner,
        expiresAt: share.createdAt,
        eligibleTargetOrganizations: [],
      }),
    acceptInvitation: () => Effect.succeed(share),
    ...overrides,
  });

export const makeRolesData = (overrides: Partial<RolesData["Service"]> = {}) =>
  RolesData.of({
    getRoles: () => Effect.succeed([role]),
    updateRole: () => Effect.succeed(role),
    ...overrides,
  });

export const makeAuthorization = (
  overrides: Partial<OrganizationWorkspaceAuthorization["Service"]> = {},
) =>
  OrganizationWorkspaceAuthorization.of({
    identity: Effect.succeed(identity),
    requireGuild: () => Effect.succeed(guildAccess),
    ...overrides,
  });

export const provideServices = (
  authorization: OrganizationWorkspaceAuthorization["Service"],
  data: OrganizationWorkspaceData["Service"],
  roles: RolesData["Service"] = makeRolesData(),
  sharing: ReservationSharingData["Service"] = makeSharingData(),
  reads: ReservationReadData["Service"] = makeReadData(),
  mine: MyReservationsData["Service"] = MyReservationsData.of({
    listMine: () => Effect.succeed({ items: [] }),
  }),
) =>
  Layer.mergeAll(
    Layer.succeed(ForwardAuthIdentity, {
      userId: "user",
      discordId: "discord",
    }),
    Layer.succeed(OrganizationWorkspaceAuthorization, authorization),
    Layer.succeed(OrganizationWorkspaceData, data),
    Layer.succeed(RolesData, roles),
    Layer.succeed(ReservationSharingData, sharing),
    Layer.succeed(ReservationReadData, reads),
    Layer.succeed(MyReservationsData, mine),
  );
