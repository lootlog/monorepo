import { describe, expect, it } from "vitest";
import { getPrimaryModifierKeyLabel } from "./get-primary-modifier-key-label";

describe("getPrimaryModifierKeyLabel", () => {
  it("uses Command for macOS reported by user agent data", () => {
    expect(
      getPrimaryModifierKeyLabel({
        platform: "",
        userAgent: "",
        userAgentData: { platform: "macOS" },
      }),
    ).toBe("⌘");
  });

  it("uses Command for legacy Apple platform values", () => {
    expect(
      getPrimaryModifierKeyLabel({
        platform: "MacIntel",
        userAgent: "",
      }),
    ).toBe("⌘");
  });

  it("uses Control for non-Apple platforms", () => {
    expect(
      getPrimaryModifierKeyLabel({
        platform: "Win32",
        userAgent: "",
      }),
    ).toBe("Ctrl");
  });
});
