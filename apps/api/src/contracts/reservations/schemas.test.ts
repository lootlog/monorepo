import { describe, expect, it } from "bun:test";
import { Schema } from "effect";
import {
  CreateReservationRequest,
  ReservationResponse,
  ReservationSpotsResponse,
  UpdateReservationRequest,
} from "./schemas.js";

const reservation = {
  id: 1,
  spotId: "spot",
  spotName: "Spot",
  startsAt: "2026-09-04T12:00:00Z",
  endsAt: "2026-09-04T13:00:00Z",
  comment: null,
  createdAt: "2026-09-04T11:00:00Z",
  author: { displayName: "Player", avatarUrl: null },
  sourceOrganization: {
    name: "Organization",
    iconUrl: null,
    isCurrent: true,
    calendarPath: "/calendar",
  },
  isMine: true,
  canEdit: true,
  canCancel: true,
  reminderMinutesBefore: null,
  editingConstraints: {
    reservationMaxDurationMinutes: 180,
    reservationMinDurationMinutes: 30,
    reservationTimeGranularityMinutes: 15,
    reservationMaxAdvanceDays: 7,
    future: { allowed: true },
  },
  future: { calendar: true },
};

describe("reservation contracts", () => {
  it("preserves extension fields on spot projections and editing constraints, while stripping them on reservation details", () => {
    const details = Schema.decodeUnknownSync(ReservationResponse)(reservation);
    expect(details).not.toHaveProperty("future");
    expect(details.editingConstraints).toMatchObject({
      future: { allowed: true },
    });
    const spots = Schema.decodeUnknownSync(ReservationSpotsResponse)([
      {
        id: "spot",
        name: "Spot",
        level: 100,
        images: [],
        maps: [],
        isPinned: false,
        isAvailableNow: false,
        availableUntil: null,
        activeReservationCount: 1,
        hasPartnerReservations: false,
        currentReservation: reservation,
        nextReservation: null,
      },
    ]);
    expect(spots[0]?.currentReservation).toHaveProperty("future", {
      calendar: true,
    });
    expect(() =>
      Schema.decodeUnknownSync(ReservationResponse)({
        ...reservation,
        editingConstraints: {
          ...reservation.editingConstraints,
          reservationMaxAdvanceDays: 0,
        },
      }),
    ).toThrow();
  });

  it("accepts timezone offsets and requires a meaningful partial reservation update", () => {
    const dates = {
      startsAt: "2026-09-04T12:00:00+02:00",
      endsAt: "2026-09-04T13:00:00+02:00",
    };
    expect(
      Schema.decodeUnknownSync(CreateReservationRequest)({
        ...dates,
        reminderMinutesBefore: 15,
      }),
    ).toEqual({ ...dates, reminderMinutesBefore: 15 });
    expect(() =>
      Schema.decodeUnknownSync(CreateReservationRequest)({
        ...dates,
        reminderMinutesBefore: 10,
      }),
    ).toThrow();
    expect(() =>
      Schema.decodeUnknownSync(UpdateReservationRequest)({}),
    ).toThrow();
    expect(() =>
      Schema.decodeUnknownSync(UpdateReservationRequest)({ unsupported: true }),
    ).toThrow();
    expect(
      Schema.decodeUnknownSync(UpdateReservationRequest)({ comment: "" }),
    ).toEqual({ comment: "" });
  });
});
