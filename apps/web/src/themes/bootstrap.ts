import {
  COLOR_MODE_STORAGE_KEY,
  DEFAULT_COLOR_MODE,
  DEFAULT_THEME_ID,
  THEME_STORAGE_KEY,
  type ColorMode,
  type ThemeId,
} from "./catalog";
import {
  applyThemeClassToRoot,
  getRootResolvedTheme,
  resolveThemeClass,
} from "./resolver";

const root = document.documentElement;
const theme =
  (localStorage.getItem(THEME_STORAGE_KEY) as ThemeId | null) ??
  DEFAULT_THEME_ID;
const colorMode =
  (localStorage.getItem(COLOR_MODE_STORAGE_KEY) as ColorMode | null) ??
  DEFAULT_COLOR_MODE;
const resolvedTheme = resolveThemeClass(theme, getRootResolvedTheme(root));

applyThemeClassToRoot({
  root,
  colorMode,
  resolvedTheme,
});
