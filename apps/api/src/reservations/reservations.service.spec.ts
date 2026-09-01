import { MyReservationsQueryDto } from "./dto/reservation-query.dto.js";
import { ReservationsService } from "./reservations.service.js";
import { attachPrismaOrmMock } from "#src/test/prisma-orm.mock";

describe("ReservationsService", () => {
  const guild = {
    id: "guild-1",
    name: "Zgarbieni",
  };
  const reservation = {
    id: 1,
    guildId: guild.id,
    spotId: "potepione-zamczysko",
    startsAt: new Date("2026-08-26T12:15:00.000Z"),
    endsAt: new Date("2026-08-26T13:15:00.000Z"),
    createdByUserId: "user-1",
    createdBy: null,
    guild,
  };
  const prisma = {
    reservation: { findMany: vi.fn() },
    userPinnedReservationSpot: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
  };
  const guildsService = { getCurrentUserAccessibleGuilds: vi.fn() };
  const catalogService = {
    getSpot: vi.fn(),
    getSpots: vi.fn(),
  };
  const sharingService = { getVisibleGuildIds: vi.fn() };
  let service: ReservationsService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-26T12:00:00.000Z"));
    vi.clearAllMocks();
    service = new ReservationsService(
      attachPrismaOrmMock(prisma) as never,
      guildsService as never,
      catalogService as never,
      sharingService as never,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps a partner-only spot locally available", async () => {
    catalogService.getSpots.mockResolvedValue([
      {
        id: reservation.spotId,
        name: "Potępione Zamczysko",
        level: 300,
        images: [],
        maps: [],
      },
    ]);
    sharingService.getVisibleGuildIds.mockResolvedValue([
      guild.id,
      "partner-guild",
    ]);
    prisma.userPinnedReservationSpot.findMany.mockResolvedValue([]);
    prisma.reservation.findMany.mockResolvedValue([
      {
        ...reservation,
        guildId: "partner-guild",
        startsAt: new Date("2026-08-26T11:30:00.000Z"),
        endsAt: new Date("2026-08-26T12:30:00.000Z"),
        guild: { id: "partner-guild", name: "Partner" },
      },
    ]);

    const [spot] = await service.listSpots({
      guildId: guild.id,
      userId: "user-1",
      discordId: "discord-1",
      actorIsOwner: false,
      permissions: [],
    });

    expect(spot).toEqual(
      expect.objectContaining({
        isAvailableNow: true,
        availableUntil: null,
        activeReservationCount: 0,
        hasPartnerReservations: true,
        currentReservation: null,
        nextReservation: null,
      }),
    );
  });

  it("derives spot availability from local reservations in a mixed calendar", async () => {
    catalogService.getSpots.mockResolvedValue([
      {
        id: reservation.spotId,
        name: "Potępione Zamczysko",
        level: 300,
        images: [],
        maps: [],
      },
    ]);
    sharingService.getVisibleGuildIds.mockResolvedValue([
      guild.id,
      "partner-guild",
    ]);
    prisma.userPinnedReservationSpot.findMany.mockResolvedValue([]);
    prisma.reservation.findMany.mockResolvedValue([
      {
        ...reservation,
        guildId: "partner-guild",
        startsAt: new Date("2026-08-26T11:30:00.000Z"),
        endsAt: new Date("2026-08-26T12:30:00.000Z"),
        guild: { id: "partner-guild", name: "Partner" },
      },
      reservation,
    ]);

    const [spot] = await service.listSpots({
      guildId: guild.id,
      userId: "user-1",
      discordId: "discord-1",
      actorIsOwner: false,
      permissions: [],
    });

    expect(spot).toEqual(
      expect.objectContaining({
        isAvailableNow: true,
        availableUntil: reservation.startsAt,
        activeReservationCount: 1,
        hasPartnerReservations: true,
        currentReservation: null,
        nextReservation: expect.objectContaining({ id: reservation.id }),
      }),
    );
  });

  it("isolates a pin by user, organization, and spot", async () => {
    catalogService.getSpot.mockResolvedValue({ id: reservation.spotId });

    await service.pinSpot("user-1", guild.id, reservation.spotId);

    expect(prisma.userPinnedReservationSpot.upsert).toHaveBeenCalledWith({
      conflictOn: {
        userId: "user-1",
        guildId: guild.id,
        spotId: reservation.spotId,
      },
      where: {
        userId: "user-1",
        guildId: guild.id,
        spotId: reservation.spotId,
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
      userId: "user-1",
      discordId: "discord-1",
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
});
