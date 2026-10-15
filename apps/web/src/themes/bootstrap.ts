import { THEME_STORAGE_KEY } from "./catalog";
import {
  applyThemeToRoot,
  createDefinitionFromBase,
  readCachedCustomTheme,
  readCustomThemeId,
} from "./custom-theme";
import {
  applyThemeClassToRoot,
  resolveStoredTheme,
  getRootResolvedTheme,
  resolveThemeClass,
} from "./resolver";

const root = document.documentElement;

const stored = localStorage.getItem(THEME_STORAGE_KEY);

const customThemeId = readCustomThemeId(stored);

const cachedCustomTheme = readCachedCustomTheme();

const customDefinition =
  customThemeId !== null && cachedCustomTheme?.id === customThemeId
    ? cachedCustomTheme.definition
    : null;

const theme = customDefinition?.baseThemeId ?? resolveStoredTheme(stored);

applyThemeClassToRoot({
  root,
  resolvedTheme: resolveThemeClass(theme, getRootResolvedTheme(root)),
});

applyThemeToRoot(root, customDefinition ?? createDefinitionFromBase(theme));
