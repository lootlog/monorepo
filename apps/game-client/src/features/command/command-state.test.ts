import { describe, expect, it } from "vitest";
import { getCommandState } from "./command-state";

describe("getCommandState", () => {
  it("treats plain text as a normal chat message", () => {
    expect(getCommandState("hej", { selectedGuildCount: 2 })).toMatchObject({
      mode: "normal",
      isNotification: false,
      isPartyCommand: false,
      hasContent: true,
      canSubmit: true,
      submissionMessage: "hej",
    });
  });

  it("treats ! as a notification command and blocks empty payloads", () => {
    expect(getCommandState("!", { selectedGuildCount: 1 })).toMatchObject({
      mode: "notification",
      isNotification: true,
      isPartyCommand: false,
      hasContent: false,
      canSubmit: false,
      submissionMessage: "",
    });
  });

  it("extracts the !grp description and keeps the party mode", () => {
    expect(
      getCommandState("!grp szukam tanca", { selectedGuildCount: 1 }),
    ).toMatchObject({
      mode: "party",
      isNotification: true,
      isPartyCommand: true,
      hasContent: true,
      canSubmit: true,
      submissionMessage: "szukam tanca",
    });
  });
});
