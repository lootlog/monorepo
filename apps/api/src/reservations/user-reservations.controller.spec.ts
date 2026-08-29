import { UpdateReservationDto } from "./dto/update-reservation.dto.js";
import { UserReservationsController } from "./user-reservations.controller.js";

describe("UserReservationsController", () => {
  const reservationsService = {
    listMine: vi.fn<(options: unknown) => unknown>(),
  };
  const reservationMutationsService = {
    updateOwned: vi.fn<(options: unknown) => unknown>(),
    deleteOwned: vi.fn<(options: unknown) => unknown>(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("derives reservation ownership from the authenticated user", () => {
    const controller = new UserReservationsController(
      reservationsService as never,
      reservationMutationsService as never,
    );
    const data = {
      startsAt: "2026-08-26T12:30:00.000Z",
      endsAt: "2026-08-26T13:30:00.000Z",
      comment: "Po aktualizacji",
      reminderMinutesBefore: 15 as const,
    };

    controller.updateMyReservation("user-1", "discord-1", 42, data);

    expect(reservationMutationsService.updateOwned).toHaveBeenCalledWith({
      userId: "user-1",
      discordId: "discord-1",
      reservationId: 42,
      data,
    });
  });

  it("rejects empty updates and client-supplied ownership metadata", () => {
    expect(UpdateReservationDto.schema.safeParse({}).success).toBe(false);
    expect(
      UpdateReservationDto.schema.safeParse({
        comment: "Próba",
        createdByUserId: "another-user",
      }).success,
    ).toBe(false);
  });
});
