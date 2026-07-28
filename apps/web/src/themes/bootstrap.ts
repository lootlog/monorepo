import { DEFAULT_THEME_ID, THEME_STORAGE_KEY, type ThemeId } from "./catalog";
import {
  applyThemeClassToRoot,
  getRootResolvedTheme,
  resolveThemeClass,
} from "./resolver";

const root = document.documentElement;
const theme =
  (localStorage.getItem(THEME_STORAGE_KEY) as ThemeId | null) ??
  DEFAULT_THEME_ID;
const resolvedTheme = resolveThemeClass(theme, getRootResolvedTheme(root));

applyThemeClassToRoot({
  root,
  resolvedTheme,
});
