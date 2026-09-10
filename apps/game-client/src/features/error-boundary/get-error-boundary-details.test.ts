import { describe, expect, it } from "vitest";
import { getErrorBoundaryDetails } from "./get-error-boundary-details";

const translations = {
  errorNameLabel: "Name",
  errorMessageLabel: "Message",
  stackLabel: "Stack",
  unknownErrorName: "Unknown error",
  unknownErrorMessage: "No message",
  missingStack: "No stack",
};

describe("getErrorBoundaryDetails", () => {
  it.each([
    ["  Network failed  ", "Network failed"],
    [" \n ", "No message"],
    [null, "No message"],
    [42, "No message"],
  ])("formats a non-Error thrown value %s", (cause, message) => {
    expect(getErrorBoundaryDetails(cause, translations).message).toBe(message);
  });

  it("keeps valid fields when another field is malformed", () => {
    const details = getErrorBoundaryDetails(
      { name: 12, message: "  Failure  ", stack: "  Frame  " },
      translations,
    );

    expect(details).toEqual({
      name: "Unknown error",
      message: "Failure",
      stack: "Frame",
      clipboardText: "Name: Unknown error\nMessage: Failure\n\nStack:\nFrame",
    });
  });

  it("retains error metadata attached to arrays", () => {
    const cause = Object.assign([], { message: "  Array failure  " });
    expect(getErrorBoundaryDetails(cause, translations).message).toBe(
      "Array failure",
    );
  });

  it("falls back when an object cannot be serialized", () => {
    const cause = {};
    Object.assign(cause, { self: cause });
    expect(getErrorBoundaryDetails(cause, translations).message).toBe(
      "No message",
    );
  });
});
