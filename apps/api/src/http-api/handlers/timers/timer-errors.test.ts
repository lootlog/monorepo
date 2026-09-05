import { describe, expect, it } from "bun:test";
import {
  InvalidRequestError,
  ResourceConflictError,
} from "#src/shared/http/http-errors";
import {
  TimersInfrastructureError,
  toTimersDataFailure,
} from "./timer-errors.js";

describe("timer failure classification", () => {
  it("preserves domain reasons and details for the HTTP response", () => {
    const failure = new ResourceConflictError({
      message: "EXISTING_TIMER",
      timerId: "timer-1",
    });
    expect(toTimersDataFailure(failure)).toBe(failure);
    const invalid = new InvalidRequestError({ message: "SPAWN_TIME_IN_PAST" });
    expect(toTimersDataFailure(invalid)).toBe(invalid);
  });

  it("wraps dependency failures as infrastructure failures", () => {
    expect(
      toTimersDataFailure(new Error("database unavailable")),
    ).toBeInstanceOf(TimersInfrastructureError);
  });
});
