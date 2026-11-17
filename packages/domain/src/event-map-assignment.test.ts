import { describe, expect, it } from "bun:test";
import { getMapAssignmentAvailability } from "./event-map-assignment.js";

describe("getMapAssignmentAvailability", () => {
  const timer = {
    minSpawnTime: "2026-07-28T13:00:00.000Z",
    maxSpawnTime: "2026-07-28T13:30:00.000Z",
  };

  it("blocks assignment before the configured window opens", () => {
    expect(
      getMapAssignmentAvailability({
        assignmentTimeoutMinutes: 5,
        now: new Date("2026-07-28T12:00:00.000Z"),
        timer,
      }),
    ).toEqual({
      allowed: false,
      enabledAt: Date.parse("2026-07-28T12:55:00.000Z"),
      reason: "TOO_EARLY",
    });
  });

  it("allows assignment exactly when the configured window opens", () => {
    expect(
      getMapAssignmentAvailability({
        assignmentTimeoutMinutes: 5,
        now: new Date("2026-07-28T12:55:00.000Z"),
        timer,
      }),
    ).toEqual({
      allowed: true,
      enabledAt: null,
      reason: null,
    });
  });

  it("blocks assignment without a timer", () => {
    expect(
      getMapAssignmentAvailability({
        assignmentTimeoutMinutes: 5,
        now: new Date("2026-07-28T12:55:00.000Z"),
        timer: null,
      }),
    ).toEqual({
      allowed: false,
      enabledAt: null,
      reason: "NO_TIMER",
    });
  });

  it("blocks assignment when the respawn window is overdue", () => {
    expect(
      getMapAssignmentAvailability({
        assignmentTimeoutMinutes: 5,
        now: new Date("2026-07-28T13:30:00.000Z"),
        timer,
      }),
    ).toEqual({
      allowed: false,
      enabledAt: null,
      reason: "OVERDUE",
    });
  });
});
