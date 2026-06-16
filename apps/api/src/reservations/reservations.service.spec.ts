import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { HttpService } from "@nestjs/axios";
import { RedisService } from "@lootlog/nest-shared/redis";
import { PrismaService } from "src/db/prisma.service";
import { mockFn } from "src/test/mock-fn";
import { ReservationsService } from "./reservations.service";

describe("ReservationsService", () => {
  const mockPrismaService = {
    guild: {
      findUnique: mockFn(),
    },
    reservation: {
      count: mockFn(),
      create: mockFn(),
      deleteMany: mockFn(),
      findFirst: mockFn(),
    },
  };

  const mockAmqpConnection = {
    publish: mockFn(),
  };

  const mockRedisService = {
    get: mockFn(),
    set: mockFn(),
    del: mockFn(),
  };

  const mockHttpService = {
    get: mockFn(),
  };

  let service: ReservationsService;

  const baseReservation = {
    reservationId: "zamek",
    createdDate: "2026-01-01T10:00:00.000Z",
    fromDate: "2026-01-01T11:00:00.000Z",
    toDate: "2026-01-01T12:00:00.000Z",
    createdBy: "discord-123",
  };

  const createReservationRecord = () => ({
    id: 1,
    guildId: "guild-123",
    reservationId: baseReservation.reservationId,
    createdDate: new Date(baseReservation.createdDate),
    fromDate: new Date(baseReservation.fromDate),
    toDate: new Date(baseReservation.toDate),
    createdBy: baseReservation.createdBy,
    comment: null,
    createdAt: new Date("2026-01-01T10:00:00.000Z"),
    updatedAt: new Date("2026-01-01T10:00:00.000Z"),
  });

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T10:00:00.000Z"));
    vi.clearAllMocks();

    mockPrismaService.guild.findUnique.mockResolvedValue({
      reservationMaxDurationMinutes: 180,
      reservationMinDurationMinutes: 30,
      reservationTimeGranularityMinutes: 15,
      reservationMaxAdvanceDays: 7,
      reservationActiveLimitPerSpot: 3,
    });
    mockPrismaService.reservation.deleteMany.mockResolvedValue({ count: 0 });
    mockPrismaService.reservation.count.mockResolvedValue(0);
    mockPrismaService.reservation.findFirst.mockResolvedValue(null);
    mockPrismaService.reservation.create.mockResolvedValue(
      createReservationRecord(),
    );

    service = new ReservationsService(
      mockPrismaService as unknown as PrismaService,
      mockAmqpConnection as unknown as AmqpConnection,
      mockRedisService as unknown as RedisService,
      mockHttpService as unknown as HttpService,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejects reservations longer than guild maximum duration", async () => {
    await expect(
      service.createReservation("guild-123", {
        ...baseReservation,
        toDate: "2026-01-01T15:00:01.000Z",
      }),
    ).rejects.toThrow("Rezerwacja może trwać maksymalnie 180 minut.");
  });

  it("rejects reservations shorter than guild minimum duration", async () => {
    await expect(
      service.createReservation("guild-123", {
        ...baseReservation,
        toDate: "2026-01-01T11:15:00.000Z",
      }),
    ).rejects.toThrow("Rezerwacja musi trwać co najmniej 30 minut.");
  });

  it("rejects dates not aligned to guild granularity", async () => {
    mockPrismaService.guild.findUnique.mockResolvedValue({
      reservationMaxDurationMinutes: 180,
      reservationMinDurationMinutes: 30,
      reservationTimeGranularityMinutes: 30,
      reservationMaxAdvanceDays: 7,
      reservationActiveLimitPerSpot: 3,
    });

    await expect(
      service.createReservation("guild-123", {
        ...baseReservation,
        fromDate: "2026-01-01T11:15:00.000Z",
        toDate: "2026-01-01T12:15:00.000Z",
      }),
    ).rejects.toThrow(
      "Rezerwacje muszą zaczynać się i kończyć w kroku co 30 minut.",
    );
  });

  it("rejects reservations too far in the future", async () => {
    mockPrismaService.guild.findUnique.mockResolvedValue({
      reservationMaxDurationMinutes: 180,
      reservationMinDurationMinutes: 30,
      reservationTimeGranularityMinutes: 15,
      reservationMaxAdvanceDays: 1,
      reservationActiveLimitPerSpot: 3,
    });

    await expect(
      service.createReservation("guild-123", {
        ...baseReservation,
        fromDate: "2026-01-03T11:00:00.000Z",
        toDate: "2026-01-03T12:00:00.000Z",
      }),
    ).rejects.toThrow("Rezerwację można utworzyć maksymalnie 1 dni do przodu.");
  });

  it("rejects active reservation limit for the same player and spot", async () => {
    mockPrismaService.reservation.count.mockResolvedValue(3);

    await expect(
      service.createReservation("guild-123", baseReservation),
    ).rejects.toThrow(
      "Możesz mieć maksymalnie 3 aktywne rezerwacje na tym expowisku.",
    );
  });

  it("still rejects overlapping reservations", async () => {
    mockPrismaService.reservation.findFirst.mockResolvedValue(
      createReservationRecord(),
    );

    await expect(
      service.createReservation("guild-123", baseReservation),
    ).rejects.toThrow(
      "Istnieje już inna rezerwacja w podanym przedziale czasowym.",
    );
  });
});
