import type { GameClientAddon } from "./types";

type AddonModule = {
  default?: GameClientAddon;
};

const addonModules = import.meta.glob<AddonModule>(
  "./extensions/**/*.addon.{ts,tsx}",
  {
    eager: true,
  },
);

const normalizeAddon = (
  modulePath: string,
  addonModule: AddonModule,
): GameClientAddon | null => {
  const addon = addonModule.default;
  if (!addon) {
    console.warn(`[addons] Missing default export in "${modulePath}"`);
    return null;
  }

  if (!addon.id) {
    console.warn(`[addons] Missing "id" in "${modulePath}"`);
    return null;
  }

  if (!addon.name) {
    console.warn(`[addons] Missing "name" in "${modulePath}"`);
    return null;
  }

  if (
    !("Mount" in addon && typeof addon.Mount === "function") &&
    !("setup" in addon && typeof addon.setup === "function")
  ) {
    console.warn(
      `[addons] Missing "Mount" or "setup" function in "${modulePath}"`,
    );
    return null;
  }

  return addon;
};

const loadAddons = (): GameClientAddon[] => {
  const addons: GameClientAddon[] = [];
  const seenIds = new Set<string>();

  for (const [modulePath, addonModule] of Object.entries(addonModules)) {
    const addon = normalizeAddon(modulePath, addonModule);
    if (!addon) {
      continue;
    }

    if (seenIds.has(addon.id)) {
      console.warn(
        `[addons] Duplicate addon id "${addon.id}" in "${modulePath}". Skipping.`,
      );
      continue;
    }

    seenIds.add(addon.id);
    addons.push(addon);
  }

  return addons.sort((a, b) => {
    const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.order ?? Number.MAX_SAFE_INTEGER;

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    return a.id.localeCompare(b.id);
  });
};

export const LOADED_ADDONS = loadAddons();
