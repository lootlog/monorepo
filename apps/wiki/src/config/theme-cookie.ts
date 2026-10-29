import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { THEME_STORAGE_KEY } from "@lootlog/ui/themes/catalog";

/**
 * The theme the User last had here. The server renders the page in it, so a
 * reload does not flash the default theme before preferences load.
 */
export const getStoredThemeSelection = createServerFn({
  method: "GET",
}).handler(() => getCookie(THEME_STORAGE_KEY) ?? null);
