import {
  DEVICE_SETTINGS_CATALOG,
  SETTINGS_CATALOG,
  type SettingsCatalogKey,
} from "@lootlog/domain/settings-documents";
import { describe, expect, it } from "vitest";
import {
  SETTINGS_SUBSECTION_DOMAINS,
  SETTINGS_SUBSECTION_VALUES,
} from "./constants/settings-tabs";
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
  it("lists domains in navigation order with battle panel as its own domain", () => {
    expect(SETTINGS_MANIFEST.map((domain) => domain.id)).toEqual([
      "general",
      "servers",
      "appearance",
      "chat",
      "timers",
      "notifications",
      "battle-panel",
      "sounds",
      "controls",
      "experimental",
      "diagnostics",
      "information",
    ]);
  });

  it("groups organization scope under general and every timer subsection under timers", () => {
    const subsectionsOf = (id: string) =>
      SETTINGS_MANIFEST.find((domain) => domain.id === id)?.subsections.map(
        (subsection) => subsection.id,
      );

    expect(subsectionsOf("general")).toEqual(["catching", "behavior"]);
    expect(subsectionsOf("servers")).toEqual(["visibility"]);
    expect(subsectionsOf("appearance")).toEqual(["npc-colors", "interface"]);
    expect(subsectionsOf("timers")).toEqual([
      "timer-behavior",
      "timer-appearance",
      "timer-colors",
      "hidden-timers",
    ]);
    expect(subsectionsOf("notifications")).toEqual([
      "notification-rules",
      "detector",
      "routing",
      "notification-mutes",
    ]);
    expect(subsectionsOf("experimental")).toEqual(["experimental"]);
    expect(subsectionsOf("battle-panel")).toEqual(["battle-panel"]);
  });

  it("owns every subsection in exactly one domain, matching the path resolver", () => {
    const seen = new Map<string, string>();

    for (const domain of SETTINGS_MANIFEST) {
      for (const subsection of domain.subsections) {
        expect(seen.has(subsection.id), subsection.id).toBe(false);
        seen.set(subsection.id, domain.id);
        expect(SETTINGS_SUBSECTION_DOMAINS[subsection.id], subsection.id).toBe(
          domain.id,
        );
      }
    }

    expect([...seen.keys()].sort()).toEqual(
      [...SETTINGS_SUBSECTION_VALUES].sort(),
    );
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
