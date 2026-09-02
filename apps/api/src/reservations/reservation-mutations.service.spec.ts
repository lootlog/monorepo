import { vi } from "#test/bun-test";
import { Permission } from "@lootlog/schema/permissions";
import { ReservationMutationsService } from "./reservation-mutations.service.js";
import type { ReservationViewerContext } from "./reservation-viewer.js";

describe("ReservationMutationsService", () => {
  const guild = {
    id: "guild-1",
    name: "Zgarbieni",
    icon: null,
    ownerId: "owner",
    reservationMaxDurationMinutes: 180,
    reservationMinDurationMinutes: 30,
    reservationTimeGranularityMinutes: 15,
    reservationMaxAdvanceDays: 7,
    reservationActiveLimitPerSpot: 3,
  };
  const member = {
    name: "Alderaan",
    avatar: "avatar-hash",
  };
  const reservation = {
    id: 1,
    guildId: guild.id,
    spotId: "potepione-zamczysko",
    spotName: "Potępione Zamczysko",
    startsAt: new Date("2026-08-26T12:15:00.000Z"),
    endsAt: new Date("2026-08-26T13:15:00.000Z"),
    createdByUserId: "user-1",
    authorDisplayName: member.name,
    authorAvatarUrl:
      "https://cdn.discordapp.com/avatars/discord-1/avatar-hash.webp?size=128",
    reminderMinutesBefore: null,
    comment: null,
    legacyReservationId: null,
    legacyCreatedDate: null,
    legacyFromDate: null,
    legacyToDate: null,
    legacyCreatedByDiscordId: null,
    createdAt: new Date("2026-08-26T12:00:00.000Z"),
    updatedAt: new Date("2026-08-26T12:00:00.000Z"),
    guild,
  };
  const context: ReservationViewerContext = {
    guildId: guild.id,
    userId: "user-1",
    discordId: "discord-1",
    actorIsOwner: false,
    permissions: [Permission.LOOTLOG_RESERVATIONS_WRITE],
  };
  const repository = {
    findGuild: vi.fn(),
    findActiveMember: vi.fn(),
    createWithGuards: vi.fn(),
    findOwned: vi.fn(),
    findVisible: vi.fn(),
    updateWithOverlapGuard: vi.fn(),
    restore: vi.fn(),
    delete: vi.fn(),
  };
  const guildsService = { getCurrentUserAccessibleGuilds: vi.fn() };
  const catalogService = { getSpot: vi.fn() };
  const sharingService = { getVisibleGuildIds: vi.fn() };
  const reminderService = {
    prepare: vi.fn(),
    schedule: vi.fn(),
    cancel: vi.fn(),
  };
  const eventsPublisher = {
    created: vi.fn(),
    deleted: vi.fn(),
    updated: vi.fn(),
  };
  let service: ReservationMutationsService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-26T12:00:00.000Z"));
    vi.clearAllMocks();
    repository.findGuild.mockResolvedValue(guild);
    repository.findActiveMember.mockResolvedValue(member);
    repository.createWithGuards.mockResolvedValue({
      kind: "created",
      reservation,
    });
    repository.findOwned.mockResolvedValue(reservation);
    repository.findVisible.mockResolvedValue(reservation);
    repository.updateWithOverlapGuard.mockResolvedValue({
      kind: "updated",
      reservation,
    });
    catalogService.getSpot.mockResolvedValue({
      id: reservation.spotId,
      name: reservation.spotName,
      level: 300,
      images: [],
      maps: [],
    });
    sharingService.getVisibleGuildIds.mockResolvedValue([
      guild.id,
      "partner-guild",
    ]);
    reminderService.prepare.mockResolvedValue(null);
    reminderService.schedule.mockResolvedValue(undefined);
    eventsPublisher.created.mockResolvedValue(undefined);
    eventsPublisher.updated.mockResolvedValue(undefined);

    service = new ReservationMutationsService(
      repository as never,
      guildsService as never,
      catalogService as never,
      sharingService as never,
      reminderService as never,
      eventsPublisher as never,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses authenticated identity and server timestamps instead of client identity", async () => {
    await service.create({
      context,
      spotId: reservation.spotId,
      data: {
        startsAt: reservation.startsAt.toISOString(),
        endsAt: reservation.endsAt.toISOString(),
      },
    });

    expect(repository.createWithGuards).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: context.userId,
        authorDisplayName: member.name,
      }),
    );
    const createInput = repository.createWithGuards.mock.calls[0]?.[0];
    expect(createInput).not.toHaveProperty("legacyCreatedByDiscordId");
    expect(eventsPublisher.created).toHaveBeenCalledWith(
      expect.objectContaining({
        audienceGuildIds: [guild.id, "partner-guild"],
      }),
    );
  });

  it("does not let a partner reservation block a local write", async () => {
    await service.create({
      context,
      spotId: reservation.spotId,
      data: {
        startsAt: reservation.startsAt.toISOString(),
        endsAt: reservation.endsAt.toISOString(),
      },
    });

    expect(repository.createWithGuards).toHaveBeenCalledWith(
      expect.objectContaining({
        guildId: guild.id,
        spotId: reservation.spotId,
      }),
    );
  });

  it("rejects an overlapping reservation in the current organization", async () => {
    repository.createWithGuards.mockResolvedValue({ kind: "overlap" });

    await expect(
      service.create({
        context,
        spotId: reservation.spotId,
        data: {
          startsAt: reservation.startsAt.toISOString(),
          endsAt: reservation.endsAt.toISOString(),
        },
      }),
    ).rejects.toMatchObject({ status: 409 });

    expect(repository.createWithGuards).toHaveBeenCalledWith(
      expect.objectContaining({ guildId: guild.id }),
    );
  });

  it("does not let a local moderator delete a partner reservation", async () => {
    repository.findVisible.mockResolvedValue({
      ...reservation,
      guildId: "partner-guild",
      createdByUserId: "another-user",
      legacyCreatedByDiscordId: "another-discord-user",
    });

    await expect(
      service.deleteVisible({
        context: {
          ...context,
          permissions: [Permission.ADMIN],
        },
        reservationId: reservation.id,
      }),
    ).rejects.toMatchObject({ status: 403 });
    expect(reminderService.cancel).not.toHaveBeenCalled();
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it("invalidates only the source organization's sharing audience when an owner deletes through a partner calendar", async () => {
    const sourceGuildId = "partner-guild";
    repository.findVisible.mockResolvedValue({
      ...reservation,
      guildId: sourceGuildId,
    });
    sharingService.getVisibleGuildIds.mockImplementation((guildId: string) =>
      Promise.resolve(
        guildId === context.guildId
          ? [context.guildId, sourceGuildId, "viewer-only-partner"]
          : [sourceGuildId, context.guildId],
      ),
    );

    await service.deleteVisible({
      context,
      reservationId: reservation.id,
    });

    expect(sharingService.getVisibleGuildIds).toHaveBeenNthCalledWith(
      2,
      sourceGuildId,
    );
    expect(eventsPublisher.deleted).toHaveBeenCalledWith({
      sourceGuildId,
      audienceGuildIds: [sourceGuildId, context.guildId],
      reservation: expect.objectContaining({ guildId: sourceGuildId }),
      actorDiscordId: context.discordId,
    });
  });

  it("requires a configured DM target before creating a reminded reservation", async () => {
    reminderService.prepare.mockRejectedValueOnce(
      Object.assign(new Error("DM target required"), { status: 422 }),
    );

    await expect(
      service.create({
        context,
        spotId: reservation.spotId,
        data: {
          startsAt: reservation.startsAt.toISOString(),
          endsAt: reservation.endsAt.toISOString(),
          reminderMinutesBefore: 15,
        },
      }),
    ).rejects.toMatchObject({ status: 422 });
    expect(repository.createWithGuards).not.toHaveBeenCalled();
  });

  it("updates an owned reservation without treating it as an overlap", async () => {
    const updatedReservation = {
      ...reservation,
      startsAt: new Date("2026-08-26T12:30:00.000Z"),
      endsAt: new Date("2026-08-26T13:30:00.000Z"),
      comment: "Po aktualizacji",
      reminderMinutesBefore: 15,
    };
    guildsService.getCurrentUserAccessibleGuilds.mockResolvedValue([guild]);
    repository.findOwned.mockResolvedValue(reservation);
    repository.updateWithOverlapGuard.mockResolvedValue({
      kind: "updated",
      reservation: updatedReservation,
    });
    reminderService.prepare.mockResolvedValue({
      target: { id: 1 },
      scheduledFor: new Date("2026-08-26T12:15:00.000Z"),
    });

    const result = await service.updateOwned({
      userId: context.userId,
      discordId: context.discordId,
      reservationId: reservation.id,
      data: {
        startsAt: updatedReservation.startsAt.toISOString(),
        endsAt: updatedReservation.endsAt.toISOString(),
        comment: updatedReservation.comment,
        reminderMinutesBefore: 15,
      },
    });

    expect(repository.updateWithOverlapGuard).toHaveBeenCalledWith(
      reservation,
      {
        startsAt: updatedReservation.startsAt,
        endsAt: updatedReservation.endsAt,
        comment: "Po aktualizacji",
        reminderMinutesBefore: 15,
        checkOverlap: true,
      },
    );
    expect(reminderService.cancel).toHaveBeenCalledWith(reservation.id);
    expect(reminderService.schedule).toHaveBeenCalledWith(
      expect.objectContaining({
        reservationId: reservation.id,
        startsAt: updatedReservation.startsAt,
      }),
    );
    expect(eventsPublisher.updated).toHaveBeenCalledWith(
      expect.objectContaining({
        audienceGuildIds: [guild.id, "partner-guild"],
        reservation: updatedReservation,
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: reservation.id,
        comment: "Po aktualizacji",
        reminderMinutesBefore: 15,
      }),
    );
  });

  it("rejects a time edit overlapping the source organization", async () => {
    guildsService.getCurrentUserAccessibleGuilds.mockResolvedValue([guild]);
    repository.findOwned.mockResolvedValue(reservation);
    repository.updateWithOverlapGuard.mockResolvedValue({ kind: "overlap" });

    await expect(
      service.updateOwned({
        userId: context.userId,
        discordId: context.discordId,
        reservationId: reservation.id,
        data: {
          startsAt: "2026-08-26T12:30:00.000Z",
          endsAt: "2026-08-26T13:30:00.000Z",
        },
      }),
    ).rejects.toMatchObject({ status: 409 });

    expect(repository.updateWithOverlapGuard).toHaveBeenCalledWith(
      reservation,
      expect.objectContaining({ checkOverlap: true }),
    );
  });

  it("does not reschedule an unchanged reminder for a comment-only edit", async () => {
    const updatedReservation = { ...reservation, comment: "Nowy komentarz" };
    guildsService.getCurrentUserAccessibleGuilds.mockResolvedValue([guild]);
    repository.findOwned.mockResolvedValue(reservation);
    repository.updateWithOverlapGuard.mockResolvedValue({
      kind: "updated",
      reservation: updatedReservation,
    });

    await service.updateOwned({
      userId: context.userId,
      discordId: context.discordId,
      reservationId: reservation.id,
      data: { comment: "Nowy komentarz" },
    });

    expect(reminderService.prepare).not.toHaveBeenCalled();
    expect(reminderService.cancel).not.toHaveBeenCalled();
    expect(reminderService.schedule).not.toHaveBeenCalled();
  });

  it("does not reveal whether another user's reservation exists during edit", async () => {
    guildsService.getCurrentUserAccessibleGuilds.mockResolvedValue([guild]);
    repository.findOwned.mockResolvedValue(null);

    await expect(
      service.updateOwned({
        userId: context.userId,
        discordId: context.discordId,
        reservationId: 999,
        data: { comment: "Nie moje" },
      }),
    ).rejects.toMatchObject({ status: 404 });

    expect(repository.updateWithOverlapGuard).not.toHaveBeenCalled();
    expect(eventsPublisher.updated).not.toHaveBeenCalled();
  });

  it("deletes only an owned reservation from an accessible organization", async () => {
    guildsService.getCurrentUserAccessibleGuilds.mockResolvedValue([guild]);
    repository.findOwned.mockResolvedValue(reservation);

    await service.deleteOwned({
      userId: context.userId,
      discordId: context.discordId,
      reservationId: reservation.id,
    });

    expect(repository.findOwned).toHaveBeenCalledWith({
      reservationId: reservation.id,
      guildIds: [guild.id],
      userId: context.userId,
      discordId: context.discordId,
    });
    expect(eventsPublisher.deleted).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceGuildId: guild.id,
        audienceGuildIds: [guild.id, "partner-guild"],
      }),
    );
  });
});
