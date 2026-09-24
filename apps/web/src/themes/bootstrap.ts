import { THEME_STORAGE_KEY } from "./catalog";
import {
  applyThemeEffectsToRoot,
  readThemeEffectsSettings,
} from "./effects/theme-effects";
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

/* Painted before React so ambient motion never starts on a machine that turned it off. */
applyThemeEffectsToRoot({
  root,
  settings: readThemeEffectsSettings(),
  idle: document.hidden,
});
