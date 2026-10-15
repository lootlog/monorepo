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

/** The User's own theme as the Web app applies it. */
export interface AppliedCustomTheme {
  id: string;
  definition: CustomThemeDefinition;
}

const SYSTEM_SANS =
  'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

/** Each font's family and its stylesheet, loaded only once it is picked. */
export const CUSTOM_THEME_FONTS: Record<
  CustomThemeFontId,
  { label: string; family: string; load?: () => Promise<void> }
> = {
  // Geist ships with the shared stylesheet, so it needs no loading.
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

/**
 * The base radius every surface derives from. `pill` keeps rounded surfaces
 * and makes controls fully round through `--control-radius`.
 */
const RADIUS_VALUES: Record<CustomThemeRadius, string> = {
  sharp: "0rem",
  soft: "0.375rem",
  // As `--radius` in the shared stylesheet.
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

/**
 * The custom properties a custom theme sets over its base theme's class: its
 * colours, wallpaper cover, font and radius. The root takes them for the
 * whole app; a theme list row takes them to preview the theme in place.
 */
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
  // Unset outside a pill theme, so controls fall back to `--radius`.
  style["--control-radius"] =
    definition.radius === "pill" ? "9999px" : "initial";

  return style;
};

/** Loads the font a custom theme uses, so its preview and pages show it. */
export const loadCustomThemeFont = (definition: CustomThemeDefinition) =>
  void CUSTOM_THEME_FONTS[definition.font].load?.();

/**
 * Sets a theme's look on the root over its base class: a custom theme's
 * tokens and wallpaper, and every theme's font and radius. A built-in theme
 * comes in as `createDefinitionFromBase`, which changes no colour.
 */
export const applyThemeToRoot = (
  root: HTMLElement,
  definition: CustomThemeDefinition,
) => {
  for (const property of STYLE_PROPERTIES) root.style.removeProperty(property);
  delete root.dataset.wallpaper;
  delete root.dataset.wallpaperCover;

  if (definition.wallpaperVisibility !== undefined) {
    root.dataset.wallpaperCover = "";
  }

  for (const [property, value] of Object.entries(
    customThemeStyle(definition),
  )) {
    root.style.setProperty(property, value);
  }

  loadCustomThemeFont(definition);

  if (definition.wallpaper === "none") {
    root.style.setProperty("--theme-background-image", "none");
    root.dataset.wallpaper = "none";
  } else if (definition.wallpaper !== "base") {
    const wallpaper = findWallpaper(definition.wallpaper);

    root.style.setProperty(
      "--theme-background-image",
      wallpaper ? `url("${wallpaper.image}")` : "none",
    );
    root.dataset.wallpaper = wallpaper ? "photo" : "none";
  }
};

/**
 * The last applied custom theme, read before React starts so a reload paints
 * it at once instead of flashing the base theme.
 */
const CUSTOM_THEME_CACHE_KEY = "lootlog-custom-theme";

export const readCachedCustomTheme = (): AppliedCustomTheme | null => {
  try {
    return parseCachedCustomTheme(localStorage.getItem(CUSTOM_THEME_CACHE_KEY));
  } catch {
    return null;
  }
};

export const writeCachedCustomTheme = (theme: AppliedCustomTheme | null) => {
  try {
    if (theme) {
      localStorage.setItem(CUSTOM_THEME_CACHE_KEY, JSON.stringify(theme));
    } else {
      localStorage.removeItem(CUSTOM_THEME_CACHE_KEY);
    }
  } catch {
    // Storage can be blocked; the theme still applies once preferences load.
  }
};

/**
 * A built-in theme as a definition, which is also where a new custom theme
 * starts: no colour changed, and the base's own font and rounding.
 */
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

/**
 * The surface knob for a picked background colour: its hue and colourfulness,
 * kept within the dark range the derived text stays readable on.
 */
export const surfaceFromColor = (hex: string): CustomThemeSurface => {
  const [lightness, chroma, hue] = rgbToOklch(hexToRgb(hex));

  return {
    hue: Math.round(hue),
    lightness: clamp(Math.round(lightness * 100) / 100, 0.08, 0.28),
    chroma: clamp(Math.round(chroma * 1000) / 1000, 0, 0.08),
  };
};
