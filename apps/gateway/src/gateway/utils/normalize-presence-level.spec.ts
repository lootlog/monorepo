import { normalizePresenceLevel } from "src/gateway/utils/normalize-presence-level";

describe("normalizePresenceLevel", () => {
  it("returns numeric levels and parses string levels", () => {
    expect(normalizePresenceLevel(120)).toBe(120);
    expect(normalizePresenceLevel("250")).toBe(250);
  });

  it("returns zero for invalid levels", () => {
    expect(normalizePresenceLevel(undefined)).toBe(0);
    expect(normalizePresenceLevel("unknown")).toBe(0);
    expect(normalizePresenceLevel(Number.NaN)).toBe(0);
  });
});
