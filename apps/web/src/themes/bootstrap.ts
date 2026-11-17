import { THEME_STORAGE_KEY } from "@lootlog/ui/themes/catalog";
import { readCachedCustomTheme } from "@lootlog/ui/themes/custom-theme";
import {
  applyThemeToDocument,
  resolveStoredSelection,
} from "@lootlog/ui/themes/resolver";
import { resolveThemeLook } from "@lootlog/ui/themes/theme-sync";

// Before React starts only the cached copy of a custom theme is known.
const { theme, definition } = resolveThemeLook({
  selection: resolveStoredSelection(localStorage.getItem(THEME_STORAGE_KEY)),
  userThemes: undefined,
  cachedCustomThemes: [readCachedCustomTheme()],
});

applyThemeToDocument({ root: document.documentElement, theme, definition });
