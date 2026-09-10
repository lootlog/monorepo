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

  it("opens appearance on NPC colors and chat on chat appearance", () => {
    expect(resolveSettingsPath("appearance")).toEqual({
      domain: "appearance",
      subsection: "npc-colors",
    });
    expect(resolveSettingsPath("chat")).toEqual({
      domain: "chat",
      subsection: "chat-appearance",
    });
  });

  it("migrates the previous notifications and sounds path", () => {
    expect(resolveSettingsPath("notifications", "sounds")).toEqual({
      domain: "sounds",
      subsection: "sounds",
    });
  });
});
