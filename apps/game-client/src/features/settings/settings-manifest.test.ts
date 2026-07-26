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
      "servers",
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

  it("exposes server visibility as a searchable settings domain", () => {
    const servers = SETTINGS_MANIFEST.find((domain) => domain.id === "servers");

    expect(servers).toMatchObject({
      icon: "server",
      labelKey: "settings.domains.servers",
    });
    expect(servers?.subsections).toEqual([
      {
        id: "visibility",
        labelKey: "settings.subsections.serverVisibility",
        controls: [
          {
            id: "server-visibility",
            labelKey: "settings.servers.title",
            descriptionKey: "settings.servers.description",
            aliases: ["serwery", "discord", "ukryte serwery"],
          },
        ],
      },
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
