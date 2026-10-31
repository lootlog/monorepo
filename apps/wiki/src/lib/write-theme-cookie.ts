import { THEME_STORAGE_KEY } from "@lootlog/ui/themes/catalog";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** Remembers the applied theme for the server's next render of the page. */
export const writeThemeCookie = (selection: string) => {
  document.cookie = `${THEME_STORAGE_KEY}=${encodeURIComponent(selection)}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax`;
};
