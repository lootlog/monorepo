import { describe, expect, it } from "vitest";
import { resolveSettingsPath } from "./settings-tabs";

describe("resolveSettingsPath", () => {
  it("opens general on behavior by default", () => {
    expect(resolveSettingsPath()).toEqual({
      domain: "general",
      subsection: "behavior",
    });
    expect(resolveSettingsPath("general", "behavior")).toEqual({
      domain: "general",
      subsection: "behavior",
    });
  });

  it("maps retired top-level tabs to their new homes", () => {
    expect(resolveSettingsPath("servers")).toEqual({
      domain: "servers",
      subsection: "visibility",
    });
    expect(resolveSettingsPath("game-data")).toEqual({
      domain: "catching",
      subsection: "catching",
    });
    expect(resolveSettingsPath("general", "catching")).toEqual({
      domain: "catching",
      subsection: "catching",
    });
    expect(resolveSettingsPath("npc-detector")).toEqual({
      domain: "detector",
      subsection: "detector",
    });
    expect(resolveSettingsPath("battle-panel")).toEqual({
      domain: "battle-panel",
      subsection: "battle-panel",
    });
  });

  it("follows a persisted subsection to the domain that owns it now", () => {
    expect(resolveSettingsPath("appearance", "timer-appearance")).toEqual({
      domain: "timers",
      subsection: "timer-appearance",
    });
    expect(resolveSettingsPath("game-data", "detector")).toEqual({
      domain: "detector",
      subsection: "detector",
    });
    expect(resolveSettingsPath("notifications", "sounds")).toEqual({
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
});
