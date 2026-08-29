import { Permission } from "#src/generated/prisma/client";
import { PERMISSIONS_KEY } from "#src/shared/permissions/permissions.decorator";
import { CreateReservationDto } from "./dto/create-reservation.dto.js";
import { ReservationsController } from "./reservations.controller.js";

describe("ReservationsController", () => {
  const reservationsService = {
    listSpots: vi.fn(),
    listWindow: vi.fn(),
    pinSpot: vi.fn(),
    unpinSpot: vi.fn(),
  };
  const reservationMutationsService = {
    create: vi.fn(),
    deleteVisible: vi.fn(),
  };

  let controller: ReservationsController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new ReservationsController(
      reservationsService as never,
      reservationMutationsService as never,
    );
  });

  it("declares read and write permissions on the new resources", () => {
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        ReservationsController.prototype.listReservationSpots,
      ),
    ).toEqual([Permission.LOOTLOG_RESERVATIONS_READ]);
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        ReservationsController.prototype.createReservation,
      ),
    ).toEqual([Permission.LOOTLOG_RESERVATIONS_WRITE]);
  });

  it("derives the author from authenticated request context", () => {
    controller.createReservation(
      { id: "guild-1", ownerId: "owner" } as never,
      "user-1",
      "discord-1",
      {
        guild: { ownerId: "owner" },
        permissions: [Permission.LOOTLOG_RESERVATIONS_WRITE],
      } as never,
      "potepione-zamczysko",
      {
        startsAt: "2026-08-26T12:00:00.000Z",
        endsAt: "2026-08-26T13:00:00.000Z",
      },
    );

    expect(reservationMutationsService.create).toHaveBeenCalledWith({
      context: {
        guildId: "guild-1",
        userId: "user-1",
        discordId: "discord-1",
        actorIsOwner: false,
        permissions: [Permission.LOOTLOG_RESERVATIONS_WRITE],
      },
      spotId: "potepione-zamczysko",
      data: {
        startsAt: "2026-08-26T12:00:00.000Z",
        endsAt: "2026-08-26T13:00:00.000Z",
      },
    });
  });

  it("rejects client-supplied author metadata", () => {
    const result = CreateReservationDto.schema.safeParse({
      startsAt: "2026-08-26T12:00:00.000Z",
      endsAt: "2026-08-26T13:00:00.000Z",
      createdBy: "another-user",
      createdDate: "2026-01-01T00:00:00.000Z",
    });

    expect(result.success).toBe(false);
  });
});
