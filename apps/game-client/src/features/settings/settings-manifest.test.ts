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
