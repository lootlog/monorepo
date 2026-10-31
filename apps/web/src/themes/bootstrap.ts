import { THEME_STORAGE_KEY } from "@lootlog/ui/themes/catalog";
import {
  findSelectedCustomTheme,
  readCustomThemeId,
} from "@lootlog/ui/themes/custom-theme";
import {
  applyThemeToDocument,
  resolveSelectionTheme,
  resolveStoredSelection,
} from "@lootlog/ui/themes/resolver";

const selection = resolveStoredSelection(
  localStorage.getItem(THEME_STORAGE_KEY),
);

// Before React starts only the cached copy of a custom theme is known.
const definition =
  findSelectedCustomTheme(readCustomThemeId(selection), undefined)
    ?.definition ?? null;

applyThemeToDocument({
  root: document.documentElement,
  theme: resolveSelectionTheme(selection, definition),
  definition,
});
