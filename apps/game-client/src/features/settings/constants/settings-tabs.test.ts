import { describe, expect, it } from "vitest";
import { resolveSettingsPath } from "./settings-tabs";

describe("resolveSettingsPath", () => {
  it("opens server visibility settings", () => {
    expect(resolveSettingsPath("servers")).toEqual({
      domain: "servers",
      subsection: "visibility",
    });
  });

  it("opens the standalone sounds domain for the persisted sounds tab", () => {
    expect(resolveSettingsPath("sounds")).toEqual({
      domain: "sounds",
      subsection: "sounds",
    });
  });

  it("migrates the previous notifications and sounds path", () => {
    expect(resolveSettingsPath("notifications", "sounds")).toEqual({
      domain: "sounds",
      subsection: "sounds",
    });
  });
});
