import {
  CAT_THEME_VARIANTS,
  DEFAULT_CAT_THEME_VARIANT,
  DEFAULT_THEME_ID,
  THEME_CLASS_IDS,
  type CatThemeVariant,
  type ColorMode,
  type ResolvedThemeId,
  type ThemeFamily,
  type ThemeId,
} from "./catalog";

const CAT_THEME_VARIANT_SET = new Set<CatThemeVariant>(CAT_THEME_VARIANTS);

export const isResolvedCatTheme = (
  theme: ResolvedThemeId | null | undefined,
): theme is CatThemeVariant =>
  theme !== null &&
  theme !== undefined &&
  CAT_THEME_VARIANT_SET.has(theme as CatThemeVariant);

export const isCatTheme = (
  theme: ThemeId | ResolvedThemeId | null | undefined,
) => theme === "cat-random" || isResolvedCatTheme(theme ?? null);

export const isRukiaTheme = (
  theme: ThemeId | ResolvedThemeId | null | undefined,
) => theme === "rukia";

export const isRiasTheme = (
  theme: ThemeId | ResolvedThemeId | null | undefined,
) => theme === "rias";

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

export const getRandomCatVariant = (): CatThemeVariant =>
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
  colorMode,
  resolvedTheme,
}: {
  root: HTMLElement;
  colorMode: ColorMode;
  resolvedTheme: ResolvedThemeId;
}) => {
  root.classList.remove("light", "dark", ...THEME_CLASS_IDS);
  root.classList.add(colorMode);

  if (resolvedTheme !== DEFAULT_THEME_ID) {
    root.classList.add(resolvedTheme);
  }
};

export const getThemeGreetingSuffix = (
  theme: ThemeId | ResolvedThemeId,
): string => {
  if (isCatTheme(theme)) return "🐱";
  if (isRukiaTheme(theme)) return "❄️";
  if (isRiasTheme(theme)) return "♔";
  return "👋";
};
