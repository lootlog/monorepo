import {
  ConflictException,
  GoneException,
  NotFoundException,
} from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReservationSharingService } from "./reservation-sharing.service.js";

const future = () => new Date(Date.now() + 60_000);

describe("ReservationSharingService", () => {
  const prisma = {
    $transaction: vi.fn(),
    reservationShare: {
      findMany: vi.fn(),
    },
    reservationShareInvitation: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
  };
  const transaction = {
    reservationShare: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    reservationShareInvitation: {
      updateMany: vi.fn(),
    },
  };
  const guildsService = {
    getGuildsForRequiredPermissions: vi.fn(),
  };
  const eventsPublisher = { sharingChanged: vi.fn() };
  let service: ReservationSharingService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.$transaction.mockImplementation(
      (callback: (value: typeof transaction) => unknown) =>
        Promise.resolve(callback(transaction)),
    );
    service = new ReservationSharingService(
      prisma as never,
      guildsService as never,
      eventsPublisher as never,
    );
  });

  it("creates an origin-independent invitation path", async () => {
    const createdAt = new Date();
    const expiresAt = future();
    prisma.reservationShareInvitation.create.mockResolvedValue({
      id: "invite",
      createdAt,
      expiresAt,
    });

    const invitation = await service.createInvitation("guild", "user");

    expect(invitation).toEqual({
      id: "invite",
      invitePath: expect.stringMatching(
        /^\/reservation-sharing\/invitations\/[\w-]+$/,
      ),
      createdAt,
      expiresAt,
    });
  });

  it("returns only the current organization and its direct partners", async () => {
    prisma.reservationShare.findMany.mockResolvedValue([
      { firstGuildId: "a", secondGuildId: "b" },
      { firstGuildId: "c", secondGuildId: "a" },
    ]);

    await expect(service.getVisibleGuildIds("a")).resolves.toEqual([
      "a",
      "b",
      "c",
    ]);
    expect(prisma.reservationShare.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ revokedAt: null }),
      }),
    );
  });

  it("does not offer the source or an existing direct partner as a target", async () => {
    prisma.reservationShareInvitation.findUnique.mockResolvedValue({
      id: "invite",
      sourceGuildId: "a",
      sourceGuild: { id: "a", name: "A", icon: null },
      acceptedAt: null,
      revokedAt: null,
      expiresAt: future(),
    });
    guildsService.getGuildsForRequiredPermissions.mockResolvedValue([
      { id: "a", name: "A", icon: null },
      { id: "b", name: "B", icon: null },
      { id: "c", name: "C", icon: null },
    ]);
    prisma.reservationShare.findMany.mockResolvedValue([
      { firstGuildId: "a", secondGuildId: "b" },
    ]);

    const preview = await service.previewInvitation("token", "discord");

    expect(preview.eligibleTargetOrganizations).toEqual([
      { id: "c", name: "C", iconUrl: null },
    ]);
  });

  it("rejects a self-share before creating a relationship", async () => {
    prisma.reservationShareInvitation.findUnique.mockResolvedValue({
      id: "invite",
      sourceGuildId: "a",
      sourceGuild: { id: "a", name: "A", icon: null },
      acceptedAt: null,
      revokedAt: null,
      expiresAt: future(),
    });
    guildsService.getGuildsForRequiredPermissions.mockResolvedValue([
      { id: "a", name: "A", icon: null },
    ]);

    await expect(
      service.acceptInvitation({
        token: "token",
        targetGuildId: "a",
        userId: "user",
        discordId: "discord",
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("rejects acceptance when another request has already claimed the invitation", async () => {
    const invitation = {
      id: "invite",
      sourceGuildId: "a",
      sourceGuild: { id: "a", name: "A", icon: null },
      createdByUserId: "creator",
      acceptedAt: null,
      revokedAt: null,
      expiresAt: future(),
    };
    prisma.reservationShareInvitation.findUnique.mockResolvedValue(invitation);
    guildsService.getGuildsForRequiredPermissions.mockResolvedValue([
      { id: "b", name: "B", icon: null },
    ]);
    transaction.reservationShareInvitation.updateMany.mockResolvedValue({
      count: 0,
    });
    transaction.reservationShare.findUnique.mockResolvedValue(null);
    transaction.reservationShare.upsert.mockResolvedValue({
      id: "share",
      createdAt: new Date(),
    });

    await expect(
      service.acceptInvitation({
        token: "token",
        targetGuildId: "b",
        userId: "user",
        discordId: "discord",
      }),
    ).rejects.toBeInstanceOf(GoneException);

    expect(
      transaction.reservationShareInvitation.updateMany,
    ).toHaveBeenCalledWith({
      where: {
        id: invitation.id,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: expect.any(Date) },
      },
      data: {
        acceptedAt: expect.any(Date),
        acceptedByUserId: "user",
        targetGuildId: "b",
      },
    });
    expect(transaction.reservationShare.upsert).not.toHaveBeenCalled();
  });

  it.each([
    [
      "revoked",
      { revokedAt: new Date(), acceptedAt: null, expiresAt: future() },
      GoneException,
    ],
    [
      "expired",
      { revokedAt: null, acceptedAt: null, expiresAt: new Date(0) },
      GoneException,
    ],
    [
      "used",
      { revokedAt: null, acceptedAt: new Date(), expiresAt: future() },
      ConflictException,
    ],
  ])("rejects a %s invitation", async (_name, state, errorType) => {
    prisma.reservationShareInvitation.findUnique.mockResolvedValue({
      id: "invite",
      sourceGuildId: "a",
      sourceGuild: { id: "a", name: "A", icon: null },
      ...state,
    });

    await expect(
      service.previewInvitation("token", "discord"),
    ).rejects.toBeInstanceOf(errorType);
  });

  it("hides unknown tokens behind a not-found response", async () => {
    prisma.reservationShareInvitation.findUnique.mockResolvedValue(null);
    await expect(
      service.previewInvitation("missing", "discord"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
