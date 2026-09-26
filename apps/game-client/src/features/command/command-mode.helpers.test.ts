import { describe, expect, it } from "vitest";
import { getCommandMode, toggleCommandMode } from "./command-mode.helpers";

describe("command mode buttons", () => {
  it("moves typed text between modes without carrying the old prefix", () => {
    const party = toggleCommandMode("!boss na 2", "party");

    expect(party).toBe("/grp boss na 2");
    expect(getCommandMode(party)).toBe("party");
    expect(toggleCommandMode(party, "notification")).toBe("!boss na 2");
  });

  it("turns the active mode off back into a plain message", () => {
    expect(toggleCommandMode("/grp boss", "party")).toBe("boss");
    expect(toggleCommandMode("!boss", "notification")).toBe("boss");
  });
});
