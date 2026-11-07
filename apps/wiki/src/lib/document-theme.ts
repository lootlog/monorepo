import type { CSSProperties } from "react";
import {
  createDefinitionFromBase,
  findSelectedCustomTheme,
  readCustomThemeId,
  themeRootAttributes,
  type AppliedCustomTheme,
} from "@lootlog/ui/themes/custom-theme";
import { CUSTOM_THEME_FONT_STYLESHEETS } from "@lootlog/ui/themes/custom-theme-font-stylesheets";
import {
  resolveSelectionTheme,
  resolveStoredSelection,
  resolveThemeClass,
} from "@lootlog/ui/themes/resolver";

/**
 * The root's attributes for the stored theme, as the browser applies them, so
 * the server renders the page in it. A custom theme renders from its last
 * applied copy, and as the default without one.
 */
export const getDocumentTheme = (
  storedSelection: string | null,
  storedCustomTheme: AppliedCustomTheme | null,
) => {
  const selection = resolveStoredSelection(storedSelection);

  const definition =
    findSelectedCustomTheme(
      readCustomThemeId(selection),
      storedCustomTheme ? [storedCustomTheme] : [],
    )?.definition ?? null;

  const theme = resolveSelectionTheme(selection, definition);
  const look = definition ?? createDefinitionFromBase(theme);
  const { style, wallpaper, wallpaperCover } = themeRootAttributes(look);

  return {
    root: {
      className: `dark ${resolveThemeClass(theme)}`,
      style: { colorScheme: "dark", ...style } satisfies CSSProperties,
      "data-wallpaper": wallpaper,
      "data-wallpaper-cover": wallpaperCover ? "" : undefined,
    },
    fontStylesheet:
      look.font === "geist" ? null : CUSTOM_THEME_FONT_STYLESHEETS[look.font],
  };
};
