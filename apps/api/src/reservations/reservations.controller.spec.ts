import { Permission } from "src/generated/prisma/client";
import { PERMISSIONS_KEY } from "src/shared/permissions/permissions.decorator";
import { ReservationsController } from "./reservations.controller";

describe("ReservationsController", () => {
  const mockReservationsService = {
    getReservations: vi.fn(),
    createReservation: vi.fn(),
    deleteReservation: vi.fn(),
    getReservationsCards: vi.fn(),
  };

  let controller: ReservationsController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new ReservationsController(mockReservationsService as never);
  });

  it("declares permissions metadata for reservation endpoints", () => {
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        ReservationsController.prototype.getReservations,
      ),
    ).toEqual([Permission.LOOTLOG_RESERVATIONS_READ]);
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        ReservationsController.prototype.createReservation,
      ),
    ).toEqual([Permission.LOOTLOG_RESERVATIONS_WRITE]);
  });

  it("passes owner status and member permissions to reservation deletion", () => {
    controller.deleteReservation(
      123,
      { id: "guild-1", ownerId: "discord-owner" } as never,
      "discord-owner",
      {
        guild: { ownerId: "discord-owner" },
        permissions: [Permission.LOOTLOG_RESERVATIONS_WRITE],
      } as never,
    );

    expect(mockReservationsService.deleteReservation).toHaveBeenCalledWith({
      guildId: "guild-1",
      reservationRecordId: 123,
      actorDiscordId: "discord-owner",
      actorIsOwner: true,
      permissions: [Permission.LOOTLOG_RESERVATIONS_WRITE],
    });
  });
});
