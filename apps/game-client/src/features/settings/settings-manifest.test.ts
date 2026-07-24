import {
  DEVICE_SETTINGS_CATALOG,
  SETTINGS_CATALOG,
  type SettingsCatalogKey,
} from "@lootlog/types";
import { describe, expect, it } from "vitest";
import { SETTINGS_MANIFEST } from "./settings-manifest";

const catalogHasKey = (key: SettingsCatalogKey) => {
  const [domain, ...pathSegments] = key.split(".");
  const path = pathSegments.join(".");

  if (domain === "device") {
    return path in DEVICE_SETTINGS_CATALOG;
  }

  return (
    domain in SETTINGS_CATALOG &&
    path in SETTINGS_CATALOG[domain as keyof typeof SETTINGS_CATALOG].fields
  );
};

describe("settings manifest persistence references", () => {
  it("places NPC colors between chat and timer appearance", () => {
    const appearance = SETTINGS_MANIFEST.find(
      (domain) => domain.id === "appearance",
    );

    expect(appearance?.subsections.map((subsection) => subsection.id)).toEqual([
      "chat",
      "npc-colors",
      "timer-appearance",
      "timer-colors",
    ]);
    expect(
      appearance?.subsections.find(
        (subsection) => subsection.id === "npc-colors",
      )?.controls[0].settingKeys,
    ).toHaveLength(7);
  });

  it("exposes sounds as a standalone domain after notifications", () => {
    const domainIds = SETTINGS_MANIFEST.map((domain) => domain.id);
    const notifications = SETTINGS_MANIFEST.find(
      (domain) => domain.id === "notifications",
    );
    const sounds = SETTINGS_MANIFEST.find((domain) => domain.id === "sounds");

    expect(domainIds).toEqual([
      "general",
      "appearance",
      "timers",
      "game-data",
      "notifications",
      "sounds",
      "controls",
      "diagnostics",
      "information",
    ]);
    expect(
      notifications?.subsections.some(
        (subsection) => subsection.id === "sounds",
      ),
    ).toBe(false);
    expect(sounds?.subsections.map((subsection) => subsection.id)).toEqual([
      "sounds",
    ]);
  });

  it("points every declared setting key to the shared catalog", () => {
    const settingKeys = SETTINGS_MANIFEST.flatMap((domain) =>
      domain.subsections.flatMap((subsection) =>
        subsection.controls.flatMap((control) => control.settingKeys ?? []),
      ),
    );

    expect(settingKeys.length).toBeGreaterThan(0);
    for (const settingKey of settingKeys) {
      expect(catalogHasKey(settingKey), settingKey).toBe(true);
    }
  });
});
