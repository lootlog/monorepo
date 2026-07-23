import { describe, expect, it } from "vitest";
import { ApiError } from "@lootlog/api-client/transport";
import { getApiErrorMessage } from "./get-api-error-message";

describe("getApiErrorMessage", () => {
  it("returns the first API validation message", () => {
    expect(
      getApiErrorMessage(
        new ApiError({
          data: {
            message: ["First validation error", "Second validation error"],
          },
          message: "Request failed",
          method: "POST",
          status: 400,
          url: "http://localhost/api/test",
        }),
      ),
    ).toBe("First validation error");
  });

  it("falls back to the native error message", () => {
    expect(getApiErrorMessage(new Error("Request failed"))).toBe(
      "Request failed",
    );
  });

  it("returns undefined when no usable message exists", () => {
    expect(getApiErrorMessage({})).toBeUndefined();
  });
});
