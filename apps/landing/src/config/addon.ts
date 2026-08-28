const DEFAULT_ADDON_URL = "https://github.com/lootlog/monorepo/releases/latest";

export function resolveAddonUrl(configuredUrl?: string): string {
  return configuredUrl || DEFAULT_ADDON_URL;
}

export const ADDON_URL = resolveAddonUrl(import.meta.env.VITE_ADDON_URL);
