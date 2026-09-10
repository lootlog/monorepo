import {
  DEVICE_SETTINGS_CATALOG,
  SETTINGS_CATALOG,
  type SettingsCatalogKey,
} from "@lootlog/domain/settings-documents";
import { describe, expect, it } from "vitest";
import { SETTINGS_MANIFEST } from "./settings-manifest";

const catalogHasKey = (key: SettingsCatalogKey) => {
  const [domain, ...pathSegments] = key.split(".");
  const path = pathSegments.join(".");

  if (domain === "device") {
    return path in DEVICE_SETTINGS_CATALOG;
  }

  return Object.entries(SETTINGS_CATALOG).some(
    ([name, catalog]) => name === domain && path in catalog.fields,
  );
};

describe("settings manifest persistence references", () => {
  it("keeps NPC colors first in appearance after moving chat to its own domain", () => {
    const appearance = SETTINGS_MANIFEST.find(
      (domain) => domain.id === "appearance",
    );

    expect(appearance?.subsections.map((subsection) => subsection.id)).toEqual([
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
      "chat",
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

  it("groups chat appearance, notifications and filters under the chat domain", () => {
    const chat = SETTINGS_MANIFEST.find((domain) => domain.id === "chat");

    expect(chat?.subsections.map((subsection) => subsection.id)).toEqual([
      "chat-appearance",
      "chat-filters",
    ]);
    expect(
      chat?.subsections
        .flatMap((subsection) => subsection.controls)
        .map((control) => control.id),
    ).toContain("chat-npc-message-types");
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
