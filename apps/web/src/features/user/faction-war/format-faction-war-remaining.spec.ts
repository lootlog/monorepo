import { describe, expect, it } from "vitest";
import { formatFactionWarRemaining } from "./format-faction-war-remaining";

describe("formatFactionWarRemaining", () => {
  it("counts a war over a month away in days instead of dropping the month", () => {
    expect(
      formatFactionWarRemaining(
        Date.parse("2026-10-31T10:53:00+01:00"),
        Date.parse("2026-12-01T00:00:00+01:00"),
      ),
    ).toBe("30 dni 13 godzin");
  });
});
