import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { parseCachedCustomTheme } from "@lootlog/schema/custom-theme";
import { THEME_STORAGE_KEY } from "@lootlog/ui/themes/catalog";
import {
  CUSTOM_THEME_CACHE_KEY,
  writeCachedCustomTheme,
} from "@lootlog/ui/themes/custom-theme";
import type { ThemePersistence } from "@lootlog/ui/themes/theme-sync";

const SELECTION_COOKIE = THEME_STORAGE_KEY;

const CUSTOM_THEME_COOKIE = CUSTOM_THEME_CACHE_KEY;

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export const getStoredTheme = createServerFn({ method: "GET" }).handler(() => ({
  selection: getCookie(SELECTION_COOKIE) ?? null,
  customTheme: parseCachedCustomTheme(getCookie(CUSTOM_THEME_COOKIE) ?? null),
}));

const writeCookie = (name: string, value: string, maxAge: number) => {
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
};

export const wikiThemePersistence: ThemePersistence = {
  writeSelection: (selection) =>
    writeCookie(SELECTION_COOKIE, selection, ONE_YEAR_SECONDS),
  writeCustomTheme: (theme) => {
    writeCachedCustomTheme(theme);

    if (theme) {
      writeCookie(CUSTOM_THEME_COOKIE, JSON.stringify(theme), ONE_YEAR_SECONDS);
    } else {
      writeCookie(CUSTOM_THEME_COOKIE, "", 0);
    }
  },
};
