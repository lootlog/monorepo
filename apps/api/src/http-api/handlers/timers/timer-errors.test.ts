import { describe, expect, it } from "bun:test";
import {
  InvalidRequestError,
  ResourceConflictError,
} from "#src/shared/http/http-errors";
import {
  TimersConflict,
  TimersInfrastructureError,
  TimersInvalidRequest,
  toTimersDataFailure,
} from "./timer-errors.js";

describe("timer failure classification", () => {
  it("keeps expected request and conflict failures in the typed channel", () => {
    expect(toTimersDataFailure(new InvalidRequestError())).toBeInstanceOf(
      TimersInvalidRequest,
    );
    expect(toTimersDataFailure(new ResourceConflictError())).toBeInstanceOf(
      TimersConflict,
    );
  });

  it("wraps dependency failures as infrastructure failures", () => {
    expect(
      toTimersDataFailure(new Error("database unavailable")),
    ).toBeInstanceOf(TimersInfrastructureError);
  });
});
