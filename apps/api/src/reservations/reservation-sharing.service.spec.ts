import {
  ConflictException,
  GoneException,
  NotFoundException,
} from "#src/shared/http/http-errors";
import { beforeEach, describe, expect, it, vi } from "#test/bun-test";
import { ReservationSharingService } from "./reservation-sharing.service.js";

const future = () => new Date(Date.now() + 60_000);

describe("ReservationSharingService", () => {
  const repository = {
    findActiveShares: vi.fn(),
    listActiveSharesWithGuilds: vi.fn(),
    findPendingInvitations: vi.fn(),
    createInvitation: vi.fn(),
    findInvitation: vi.fn(),
    acceptInvitation: vi.fn(),
    revokeInvitation: vi.fn(),
    findActiveShare: vi.fn(),
    revokeShare: vi.fn(),
  };
  const guildsService = {
    getGuildsForRequiredPermissions: vi.fn(),
  };
  const eventsPublisher = { sharingChanged: vi.fn() };
  let service: ReservationSharingService;

  beforeEach(() => {
    vi.clearAllMocks();
    repository.findActiveShares.mockResolvedValue([]);
    service = new ReservationSharingService(
      repository as never,
      guildsService as never,
      eventsPublisher as never,
    );
  });

  it("creates an origin-independent invitation path", async () => {
    const createdAt = new Date();
    const expiresAt = future();
    repository.createInvitation.mockResolvedValue({
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
    repository.findActiveShares.mockResolvedValue([
      { firstGuildId: "a", secondGuildId: "b" },
      { firstGuildId: "c", secondGuildId: "a" },
    ]);

    await expect(service.getVisibleGuildIds("a")).resolves.toEqual([
      "a",
      "b",
      "c",
    ]);
    expect(repository.findActiveShares).toHaveBeenCalledWith("a");
  });

  it("does not offer the source or an existing direct partner as a target", async () => {
    repository.findInvitation.mockResolvedValue({
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
    repository.findActiveShares.mockResolvedValue([
      { firstGuildId: "a", secondGuildId: "b" },
    ]);

    const preview = await service.previewInvitation("token", "discord");

    expect(preview.eligibleTargetOrganizations).toEqual([
      { id: "c", name: "C", iconUrl: null },
    ]);
  });

  it("rejects a self-share before creating a relationship", async () => {
    repository.findInvitation.mockResolvedValue({
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
    repository.findInvitation.mockResolvedValue(invitation);
    guildsService.getGuildsForRequiredPermissions.mockResolvedValue([
      { id: "b", name: "B", icon: null },
    ]);
    repository.acceptInvitation.mockResolvedValue({ kind: "expired" });

    await expect(
      service.acceptInvitation({
        token: "token",
        targetGuildId: "b",
        userId: "user",
        discordId: "discord",
      }),
    ).rejects.toBeInstanceOf(GoneException);

    expect(repository.acceptInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        invitationId: invitation.id,
        acceptedByUserId: "user",
        targetGuildId: "b",
      }),
    );
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
    repository.findInvitation.mockResolvedValue({
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
    repository.findInvitation.mockResolvedValue(null);
    await expect(
      service.previewInvitation("missing", "discord"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
