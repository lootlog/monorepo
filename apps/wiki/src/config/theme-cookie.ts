import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { parseCachedCustomTheme } from "@lootlog/schema/custom-theme";
import { THEME_STORAGE_KEY } from "@lootlog/ui/themes/catalog";
import { CUSTOM_THEME_CACHE_KEY } from "@lootlog/ui/themes/custom-theme";

/**
 * The theme the User last had here, with the last applied copy of a custom
 * one. The server renders the page in it, so a reload does not flash the
 * default theme before preferences load.
 */
export const getStoredTheme = createServerFn({ method: "GET" }).handler(() => ({
  selection: getCookie(THEME_STORAGE_KEY) ?? null,
  customTheme: parseCachedCustomTheme(
    getCookie(CUSTOM_THEME_CACHE_KEY) ?? null,
  ),
}));
