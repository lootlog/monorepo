import {
  CAT_THEME_VARIANTS,
  DEFAULT_THEME_ID,
  DEFAULT_CAT_THEME_VARIANT,
  THEME_CLASS_IDS,
  type CatThemeVariant,
  type ResolvedThemeId,
  type ThemeFamily,
  type ThemeId,
} from "./catalog";
import {
  BUILT_IN_THEME_IDS,
  type CustomThemeDefinition,
} from "@lootlog/schema/custom-theme";
import {
  applyThemeToRoot,
  createDefinitionFromBase,
  readCustomThemeId,
  toCustomThemePreference,
  type CustomThemeSelection,
} from "./custom-theme";

const isResolvedCatTheme = (
  theme: ResolvedThemeId | null | undefined,
): theme is CatThemeVariant =>
  theme !== null &&
  theme !== undefined &&
  CAT_THEME_VARIANTS.some((variant) => variant === theme);

export const isCatTheme = (
  theme: ThemeId | ResolvedThemeId | null | undefined,
) => theme === "cat-random" || isResolvedCatTheme(theme ?? null);

export const isRukiaTheme = (
  theme: ThemeId | ResolvedThemeId | null | undefined,
) => theme === "rukia";

const isRiasTheme = (theme: ThemeId | ResolvedThemeId | null | undefined) =>
  theme === "rias";

export const getThemeFamily = (
  theme: ThemeId | ResolvedThemeId | null | undefined,
): ThemeFamily => {
  if (isRukiaTheme(theme)) {
    return "rukia";
  }

  if (isRiasTheme(theme)) {
    return "rias";
  }

  if (isCatTheme(theme)) {
    return "cat";
  }

  return "standard";
};

const getRandomCatVariant = (): CatThemeVariant =>
  CAT_THEME_VARIANTS[Math.floor(Math.random() * CAT_THEME_VARIANTS.length)] ??
  DEFAULT_CAT_THEME_VARIANT;

export const getRootResolvedTheme = (
  root: Element | null | undefined,
): ResolvedThemeId | null => {
  if (!root) {
    return null;
  }

  return (
    THEME_CLASS_IDS.find((themeId) => root.classList.contains(themeId)) ?? null
  );
};

export const resolveThemeClass = (
  theme: ThemeId,
  currentResolvedTheme?: ResolvedThemeId | null,
): ResolvedThemeId => {
  if (theme !== "cat-random") {
    return theme;
  }

  if (isResolvedCatTheme(currentResolvedTheme)) {
    return currentResolvedTheme;
  }

  return getRandomCatVariant();
};

export const applyThemeClassToRoot = ({
  root,
  resolvedTheme,
}: {
  root: HTMLElement;
  resolvedTheme: ResolvedThemeId;
}) => {
  root.classList.remove("light", "dark", ...THEME_CLASS_IDS);
  root.classList.add("dark", resolvedTheme);
  root.style.colorScheme = "dark";
};

export const isThemeId = (value: string): value is ThemeId =>
  BUILT_IN_THEME_IDS.some((theme) => theme === value);

const resolveStoredTheme = (value: string | null | undefined): ThemeId =>
  value && isThemeId(value) ? value : DEFAULT_THEME_ID;

export type ThemeSelection = ThemeId | CustomThemeSelection;

export const resolveStoredSelection = (
  value: string | null | undefined,
): ThemeSelection => {
  const customThemeId = readCustomThemeId(value);

  return customThemeId
    ? toCustomThemePreference(customThemeId)
    : resolveStoredTheme(value);
};

export const resolveSelectionTheme = (
  selection: ThemeSelection,
  definition: CustomThemeDefinition | null,
): ThemeId =>
  definition?.baseThemeId ??
  (readCustomThemeId(selection) === null
    ? resolveStoredTheme(selection)
    : DEFAULT_THEME_ID);

export const applyThemeToDocument = ({
  root,
  theme,
  definition,
  currentResolvedTheme = getRootResolvedTheme(root),
}: {
  root: HTMLElement;
  theme: ThemeId;
  definition: CustomThemeDefinition | null;
  currentResolvedTheme?: ResolvedThemeId | null;
}): ResolvedThemeId => {
  const resolvedTheme = resolveThemeClass(theme, currentResolvedTheme);

  applyThemeClassToRoot({ root, resolvedTheme });
  applyThemeToRoot(root, definition ?? createDefinitionFromBase(theme));

  return resolvedTheme;
};

export const previewThemeClass = (theme: ThemeId): ResolvedThemeId =>
  theme === "cat-random" ? DEFAULT_CAT_THEME_VARIANT : theme;
