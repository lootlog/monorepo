import { THEME_STORAGE_KEY } from "./catalog";
import {
  applyThemeClassToRoot,
  resolveStoredTheme,
  getRootResolvedTheme,
  resolveThemeClass,
} from "./resolver";

const root = document.documentElement;

const theme = resolveStoredTheme(localStorage.getItem(THEME_STORAGE_KEY));

const resolvedTheme = resolveThemeClass(theme, getRootResolvedTheme(root));

applyThemeClassToRoot({
  root,
  resolvedTheme,
});
