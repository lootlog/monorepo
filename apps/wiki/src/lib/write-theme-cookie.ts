import { THEME_STORAGE_KEY } from "@lootlog/ui/themes/catalog";
import {
  CUSTOM_THEME_CACHE_KEY,
  type AppliedCustomTheme,
} from "@lootlog/ui/themes/custom-theme";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

const writeCookie = (name: string, value: string, maxAge: number) => {
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
};

/** Remembers the applied theme for the server's next render of the page. */
export const writeThemeCookie = (selection: string) => {
  writeCookie(THEME_STORAGE_KEY, selection, ONE_YEAR_SECONDS);
};

/** Remembers the applied custom theme's look, which the selection only names. */
export const writeCustomThemeCookie = (theme: AppliedCustomTheme | null) => {
  if (theme) {
    writeCookie(
      CUSTOM_THEME_CACHE_KEY,
      JSON.stringify(theme),
      ONE_YEAR_SECONDS,
    );
  } else {
    writeCookie(CUSTOM_THEME_CACHE_KEY, "", 0);
  }
};
