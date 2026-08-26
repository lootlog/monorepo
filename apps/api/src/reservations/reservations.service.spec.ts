import { Permission } from "src/generated/prisma/client";
import {
  ReservationsService,
  type ViewerContext,
} from "./reservations.service";
import { MyReservationsQueryDto } from "./dto/reservation-query.dto";

describe("ReservationsService", () => {
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
  const context: ViewerContext = {
    guildId: guild.id,
    userId: "user-1",
    discordId: "discord-1",
    actorIsOwner: false,
    permissions: [Permission.LOOTLOG_RESERVATIONS_WRITE],
  };
  const transaction = {
    reservation: {
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };
  const prisma = {
    guild: {
      findUniqueOrThrow: vi.fn(),
      findUnique: vi.fn(),
    },
    member: { findFirst: vi.fn() },
    reservation: {
      delete: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    userPinnedReservationSpot: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  const guildsService = { getCurrentUserAccessibleGuilds: vi.fn() };
  const catalogService = {
    getSpot: vi.fn(),
    getSpots: vi.fn(),
  };
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
  let service: ReservationsService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-26T12:00:00.000Z"));
    vi.clearAllMocks();
    prisma.guild.findUniqueOrThrow.mockResolvedValue(guild);
    prisma.guild.findUnique.mockResolvedValue(guild);
    prisma.member.findFirst.mockResolvedValue(member);
    prisma.$transaction.mockImplementation(
      async (callback: (value: typeof transaction) => unknown) =>
        callback(transaction),
    );
    transaction.reservation.findFirst.mockResolvedValue(null);
    transaction.reservation.count.mockResolvedValue(0);
    transaction.reservation.create.mockResolvedValue(reservation);
    transaction.reservation.update.mockResolvedValue(reservation);
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

    service = new ReservationsService(
      prisma as never,
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
    await service.createReservation({
      context,
      spotId: reservation.spotId,
      data: {
        startsAt: reservation.startsAt.toISOString(),
        endsAt: reservation.endsAt.toISOString(),
      },
    });

    expect(transaction.reservation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        createdByUserId: context.userId,
        authorDisplayName: member.name,
      }),
      include: { guild: true },
    });
    const createInput = transaction.reservation.create.mock.calls[0]?.[0];
    expect(createInput?.data).not.toHaveProperty("legacyCreatedByDiscordId");
    expect(eventsPublisher.created).toHaveBeenCalledWith(
      expect.objectContaining({
        audienceGuildIds: [guild.id, "partner-guild"],
      }),
    );
  });

  it("checks overlap across every directly visible partner", async () => {
    transaction.reservation.findFirst.mockResolvedValue({ id: 99 });

    await expect(
      service.createReservation({
        context,
        spotId: reservation.spotId,
        data: {
          startsAt: reservation.startsAt.toISOString(),
          endsAt: reservation.endsAt.toISOString(),
        },
      }),
    ).rejects.toMatchObject({ status: 409 });

    expect(transaction.reservation.findFirst).toHaveBeenCalledWith({
      where: expect.objectContaining({
        guildId: { in: [guild.id, "partner-guild"] },
        spotId: reservation.spotId,
      }),
      select: { id: true },
    });
  });

  it("does not check an unrelated organization without a direct share", async () => {
    sharingService.getVisibleGuildIds.mockResolvedValue([guild.id]);

    await service.createReservation({
      context,
      spotId: reservation.spotId,
      data: {
        startsAt: reservation.startsAt.toISOString(),
        endsAt: reservation.endsAt.toISOString(),
      },
    });

    expect(transaction.reservation.findFirst).toHaveBeenCalledWith({
      where: expect.objectContaining({ guildId: { in: [guild.id] } }),
      select: { id: true },
    });
  });

  it("isolates a pin by user, organization, and spot", async () => {
    await service.pinSpot("user-1", guild.id, reservation.spotId);

    expect(prisma.userPinnedReservationSpot.upsert).toHaveBeenCalledWith({
      where: {
        userId_guildId_spotId: {
          userId: "user-1",
          guildId: guild.id,
          spotId: reservation.spotId,
        },
      },
      create: {
        userId: "user-1",
        guildId: guild.id,
        spotId: reservation.spotId,
      },
      update: {},
    });
  });

  it("returns every reservation in the selected personal history window", async () => {
    const query = new MyReservationsQueryDto();
    query.status = "upcoming";
    const laterReservation = {
      ...reservation,
      id: 2,
      startsAt: new Date("2026-08-26T14:15:00.000Z"),
      endsAt: new Date("2026-08-26T15:15:00.000Z"),
    };
    guildsService.getCurrentUserAccessibleGuilds.mockResolvedValue([guild]);
    prisma.reservation.findMany.mockResolvedValue([
      reservation,
      laterReservation,
    ]);

    const result = await service.listMine({
      userId: context.userId,
      discordId: context.discordId,
      query,
    });

    expect(result).toEqual({
      items: [
        expect.objectContaining({ id: reservation.id }),
        expect.objectContaining({ id: laterReservation.id }),
      ],
    });
    expect(prisma.reservation.findMany.mock.calls[0]?.[0]).not.toHaveProperty(
      "take",
    );
  });

  it("does not let a local moderator delete a partner reservation", async () => {
    prisma.reservation.findFirst.mockResolvedValue({
      ...reservation,
      guildId: "partner-guild",
      createdByUserId: "another-user",
      legacyCreatedByDiscordId: "another-discord-user",
    });

    await expect(
      service.deleteReservation({
        context: {
          ...context,
          permissions: [Permission.ADMIN],
        },
        reservationId: reservation.id,
      }),
    ).rejects.toMatchObject({ status: 403 });
    expect(reminderService.cancel).not.toHaveBeenCalled();
    expect(prisma.reservation.delete).not.toHaveBeenCalled();
  });

  it("invalidates only the source organization's sharing audience when an owner deletes through a partner calendar", async () => {
    const sourceGuildId = "partner-guild";
    prisma.reservation.findFirst.mockResolvedValue({
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

    await service.deleteReservation({
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
      service.createReservation({
        context,
        spotId: reservation.spotId,
        data: {
          startsAt: reservation.startsAt.toISOString(),
          endsAt: reservation.endsAt.toISOString(),
          reminderMinutesBefore: 15,
        },
      }),
    ).rejects.toMatchObject({ status: 422 });
    expect(transaction.reservation.create).not.toHaveBeenCalled();
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
    prisma.reservation.findFirst.mockResolvedValue(reservation);
    transaction.reservation.update.mockResolvedValue(updatedReservation);
    reminderService.prepare.mockResolvedValue({
      target: { id: 1 },
      scheduledFor: new Date("2026-08-26T12:15:00.000Z"),
    });

    const result = await service.updateMine({
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

    expect(transaction.reservation.findFirst).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: { not: reservation.id },
        guildId: { in: [guild.id, "partner-guild"] },
        spotId: reservation.spotId,
      }),
      select: { id: true },
    });
    expect(transaction.reservation.update).toHaveBeenCalledWith({
      where: { id: reservation.id },
      data: {
        startsAt: updatedReservation.startsAt,
        endsAt: updatedReservation.endsAt,
        comment: "Po aktualizacji",
        reminderMinutesBefore: 15,
      },
      include: { guild: true },
    });
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

  it("does not reschedule an unchanged reminder for a comment-only edit", async () => {
    const updatedReservation = { ...reservation, comment: "Nowy komentarz" };
    guildsService.getCurrentUserAccessibleGuilds.mockResolvedValue([guild]);
    prisma.reservation.findFirst.mockResolvedValue(reservation);
    transaction.reservation.update.mockResolvedValue(updatedReservation);

    await service.updateMine({
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
    prisma.reservation.findFirst.mockResolvedValue(null);

    await expect(
      service.updateMine({
        userId: context.userId,
        discordId: context.discordId,
        reservationId: 999,
        data: { comment: "Nie moje" },
      }),
    ).rejects.toMatchObject({ status: 404 });

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(eventsPublisher.updated).not.toHaveBeenCalled();
  });
});
