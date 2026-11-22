import type { CSSProperties } from "react";
import {
  createDefinitionFromBase,
  themeRootAttributes,
  type AppliedCustomTheme,
} from "@lootlog/ui/themes/custom-theme";
import { CUSTOM_THEME_FONT_STYLESHEETS } from "@lootlog/ui/themes/custom-theme-font-stylesheets";
import {
  resolveStoredSelection,
  resolveThemeClass,
} from "@lootlog/ui/themes/resolver";
import { resolveThemeLook } from "@lootlog/ui/themes/theme-sync";

export const getDocumentTheme = (
  storedSelection: string | null,
  storedCustomTheme: AppliedCustomTheme | null,
) => {
  const { theme, definition } = resolveThemeLook({
    selection: resolveStoredSelection(storedSelection),
    userThemes: undefined,
    cachedCustomThemes: [storedCustomTheme],
  });

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
