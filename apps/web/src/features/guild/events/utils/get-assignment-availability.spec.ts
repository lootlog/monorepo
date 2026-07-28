import { describe, expect, it } from "vitest";
import { getAssignmentAvailability } from "./get-assignment-availability";

describe("getAssignmentAvailability", () => {
  const timer = {
    minSpawnTime: "2026-07-28T13:00:00.000Z",
    maxSpawnTime: "2026-07-28T13:30:00.000Z",
  };

  it("blocks assignment before the configured window opens", () => {
    expect(
      getAssignmentAvailability({
        assignmentTimeoutMinutes: 5,
        now: new Date("2026-07-28T12:00:00.000Z"),
        timer,
      }),
    ).toEqual({
      allowed: false,
      enabledAt: new Date("2026-07-28T12:55:00.000Z"),
      reason: "TOO_EARLY",
    });
  });

  it("allows assignment exactly when the configured window opens", () => {
    expect(
      getAssignmentAvailability({
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
      getAssignmentAvailability({
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
      getAssignmentAvailability({
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
