import { describe, expect, it } from "vitest";
import { reservationSlug } from "@/features/guild/reservations/reservation-slug";
import type { ReservationResponseDto } from "@/lib/api/generated/main/model";
import { mapReservationsByAlias } from "./reservations-api";

const createApiReservation = (
  overrides: Partial<ReservationResponseDto> = {},
): ReservationResponseDto => ({
  id: 1,
  reservationId: "reservation-1",
  createdDate: "2026-01-03T10:00:00.000Z",
  fromDate: "2026-01-04T10:00:00.000Z",
  toDate: "2026-01-04T11:00:00.000Z",
  createdBy: "tester",
  comment: "note",
  ...overrides,
});

describe("mapReservationsByAlias", () => {
  it("shares the same list across aliases", () => {
    const worldName = "Zażółć Gęślą";
    const result = mapReservationsByAlias({
      [worldName]: [createApiReservation()],
    });

    expect(result[worldName]).toHaveLength(1);
    expect(result[worldName.toLowerCase()]).toBe(result[worldName]);
    expect(result[reservationSlug(worldName)]).toBe(result[worldName]);
    expect(result[worldName]?.[0]?.fromDate).toBe("2026-01-04T10:00:00.000Z");
    expect(result[worldName]?.[0]?.comment).toBe("note");
  });

  it("deduplicates merged aliases and sorts reservations by start date", () => {
    const earlierReservation = createApiReservation({
      id: 2,
      reservationId: "reservation-2",
      fromDate: "2026-01-02T10:00:00.000Z",
    });
    const duplicatedReservation = createApiReservation({
      id: 1,
      fromDate: "2026-01-05T10:00:00.000Z",
    });

    const result = mapReservationsByAlias({
      Example: [duplicatedReservation],
      example: [earlierReservation, duplicatedReservation],
    });

    expect(result.example).toHaveLength(2);
    expect(result.Example).toBe(result.example);
    expect(result.example?.map((reservation) => reservation.id)).toEqual([
      2, 1,
    ]);
    expect(result.example?.[0]?.comment).toBe("note");
  });

  it("preserves missing comments as undefined", () => {
    const result = mapReservationsByAlias({
      test: [createApiReservation({ comment: undefined })],
    });

    expect(result.test?.[0]?.comment).toBeUndefined();
  });
});
