import {
  CUSTOM_THEME_PREFERENCE_PREFIX,
  CUSTOM_THEME_TOKEN_KEYS,
  parseCachedCustomTheme,
  type BuiltInThemeId,
  type CustomThemeDefinition,
  type CustomThemeFontId,
  type CustomThemeRadius,
  type CustomThemeSurface,
} from "@lootlog/schema/custom-theme";
import { hexToRgb, rgbToOklch } from "@lootlog/domain/color";
import {
  deriveCustomThemeTokens,
  deriveWallpaperCover,
} from "@lootlog/domain/custom-theme";
import { clamp } from "es-toolkit";
import { THEME_CATALOG } from "./catalog";
import { findWallpaper } from "./wallpapers";

export interface AppliedCustomTheme {
  id: string;
  definition: CustomThemeDefinition;
}

const SYSTEM_SANS =
  'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

export const CUSTOM_THEME_FONTS: Record<
  CustomThemeFontId,
  { label: string; family: string; load?: () => Promise<void> }
> = {
  geist: { label: "Geist", family: "Geist Variable" },
  inter: {
    label: "Inter",
    family: "Inter Variable",
    load: () => import("@fontsource-variable/inter").then(() => undefined),
  },
  "mona-sans": {
    label: "Mona Sans",
    family: "Mona Sans Variable",
    load: () => import("@fontsource-variable/mona-sans").then(() => undefined),
  },
  "ibm-plex-sans": {
    label: "IBM Plex Sans",
    family: "IBM Plex Sans Variable",
    load: () =>
      import("@fontsource-variable/ibm-plex-sans").then(() => undefined),
  },
  nunito: {
    label: "Nunito",
    family: "Nunito Variable",
    load: () => import("@fontsource-variable/nunito").then(() => undefined),
  },
  "space-grotesk": {
    label: "Space Grotesk",
    family: "Space Grotesk Variable",
    load: () =>
      import("@fontsource-variable/space-grotesk").then(() => undefined),
  },
  lexend: {
    label: "Lexend",
    family: "Lexend Variable",
    load: () => import("@fontsource-variable/lexend").then(() => undefined),
  },
  "atkinson-hyperlegible": {
    label: "Atkinson Hyperlegible",
    family: "Atkinson Hyperlegible Next Variable",
    load: () =>
      import("@fontsource-variable/atkinson-hyperlegible-next").then(
        () => undefined,
      ),
  },
};

const RADIUS_VALUES: Record<CustomThemeRadius, string> = {
  sharp: "0rem",
  soft: "0.375rem",
  default: "0.625rem",
  round: "0.875rem",
  pill: "0.875rem",
};

const STYLE_PROPERTIES = [
  ...CUSTOM_THEME_TOKEN_KEYS.map((token) => `--${token}`),
  "--theme-background-image",
  "--font-sans",
  "--radius",
  "--control-radius",
  "--custom-wallpaper-overlay",
  "--custom-list-tile-cover",
  "--custom-card-cover",
];

export type CustomThemeSelection = `custom:${string}`;

export const toCustomThemePreference = (
  themeId: string,
): CustomThemeSelection => `custom:${themeId}`;

export const readCustomThemeId = (preference: string | null | undefined) =>
  preference?.startsWith(CUSTOM_THEME_PREFERENCE_PREFIX)
    ? preference.slice(CUSTOM_THEME_PREFERENCE_PREFIX.length)
    : null;

export type CustomThemeStyle = Record<`--${string}`, string>;

export const customThemeStyle = (
  definition: CustomThemeDefinition,
): CustomThemeStyle => {
  const style: CustomThemeStyle = Object.fromEntries(
    Object.entries(deriveCustomThemeTokens(definition)).map(
      ([token, value]) => [`--${token}`, value],
    ),
  );

  if (definition.wallpaperVisibility !== undefined) {
    const cover = deriveWallpaperCover(definition.wallpaperVisibility);

    style["--custom-wallpaper-overlay"] = `${cover.overlay}%`;
    style["--custom-list-tile-cover"] = `${cover.listTile}%`;
    style["--custom-card-cover"] = `${cover.card}%`;
  }

  const font = CUSTOM_THEME_FONTS[definition.font];

  style["--font-sans"] = `"${font.family}", ${SYSTEM_SANS}`;

  style["--radius"] = RADIUS_VALUES[definition.radius];
  style["--control-radius"] =
    definition.radius === "pill" ? "9999px" : "initial";

  return style;
};

export const loadCustomThemeFont = (definition: CustomThemeDefinition) =>
  void CUSTOM_THEME_FONTS[definition.font].load?.();

export interface ThemeRootAttributes {
  style: CustomThemeStyle;
  wallpaper: "photo" | "none" | undefined;
  wallpaperCover: boolean;
}

export const themeRootAttributes = (
  definition: CustomThemeDefinition,
): ThemeRootAttributes => {
  const style = customThemeStyle(definition);
  let wallpaper: ThemeRootAttributes["wallpaper"];

  if (definition.wallpaper === "none") {
    style["--theme-background-image"] = "none";
    wallpaper = "none";
  } else if (definition.wallpaper !== "base") {
    const picked = findWallpaper(definition.wallpaper);

    style["--theme-background-image"] = picked
      ? `url("${picked.image}")`
      : "none";
    wallpaper = picked ? "photo" : "none";
  }

  return {
    style,
    wallpaper,
    wallpaperCover: definition.wallpaperVisibility !== undefined,
  };
};

export const applyThemeToRoot = (
  root: HTMLElement,
  definition: CustomThemeDefinition,
) => {
  for (const property of STYLE_PROPERTIES) root.style.removeProperty(property);
  delete root.dataset.wallpaper;
  delete root.dataset.wallpaperCover;

  const { style, wallpaper, wallpaperCover } = themeRootAttributes(definition);

  for (const [property, value] of Object.entries(style)) {
    root.style.setProperty(property, value);
  }

  if (wallpaper) root.dataset.wallpaper = wallpaper;

  if (wallpaperCover) root.dataset.wallpaperCover = "";

  loadCustomThemeFont(definition);
};

export const CUSTOM_THEME_CACHE_KEY = "lootlog-custom-theme";

export const readCachedCustomTheme = (): AppliedCustomTheme | null => {
  try {
    return parseCachedCustomTheme(localStorage.getItem(CUSTOM_THEME_CACHE_KEY));
  } catch {
    return null;
  }
};

export const findSelectedCustomTheme = (
  customThemeId: string | null,
  themes: readonly AppliedCustomTheme[],
): AppliedCustomTheme | null => {
  if (customThemeId === null) return null;

  const found = themes.find(({ id }) => id === customThemeId);

  return found ? { id: found.id, definition: found.definition } : null;
};

export const writeCachedCustomTheme = (theme: AppliedCustomTheme | null) => {
  try {
    if (theme) {
      localStorage.setItem(CUSTOM_THEME_CACHE_KEY, JSON.stringify(theme));
    } else {
      localStorage.removeItem(CUSTOM_THEME_CACHE_KEY);
    }
  } catch {}
};

export const createDefinitionFromBase = (
  baseThemeId: BuiltInThemeId,
): CustomThemeDefinition => {
  const base = THEME_CATALOG.find(({ name }) => name === baseThemeId);

  return {
    baseThemeId,
    overrides: {},
    wallpaper: "base",
    font: base?.font ?? "geist",
    radius: base?.radius ?? "default",
  };
};

export const surfaceFromColor = (hex: string): CustomThemeSurface => {
  const [lightness, chroma, hue] = rgbToOklch(hexToRgb(hex));

  return {
    hue: Math.round(hue),
    lightness: clamp(Math.round(lightness * 100) / 100, 0.08, 0.28),
    chroma: clamp(Math.round(chroma * 1000) / 1000, 0, 0.08),
  };
};
