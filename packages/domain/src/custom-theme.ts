import { omit } from "es-toolkit";
import {
  CUSTOM_THEME_FONT_IDS,
  CUSTOM_THEME_TOKEN_KEYS,
  CUSTOM_THEME_RADIUS_STEPS,
  type BuiltInThemeId,
  type CustomThemeDefinition,
  type CustomThemeSurface,
  type CustomThemeTokenKey,
} from "@lootlog/schema/custom-theme";
import {
  contrastRatio,
  hexToRgb,
  oklchToHex,
  rgbToOklch,
  type OklchColor,
} from "./color.js";

export type CustomThemeTokens = Partial<Record<CustomThemeTokenKey, string>>;

/**
 * Lightness of each surface relative to the content background, as in the
 * shipped dark themes: the sidebar sits a step below the content, raised
 * surfaces a step above it.
 */
const SURFACE_LADDER = {
  sidebar: -0.04,
  background: 0,
  card: 0.035,
  popover: 0.045,
  "sidebar-accent": 0.055,
  secondary: 0.07,
  muted: 0.08,
  border: 0.135,
} as const satisfies Partial<Record<CustomThemeTokenKey, number>>;

/** Body text reads at AAA; supporting text and accent labels at AA. */
const BODY_TEXT_CONTRAST = 7;

const SUPPORTING_TEXT_CONTRAST = 4.5;

/** Text chroma stays near grey so it reads on any surface hue. */
const TEXT_CHROMA_LIMIT = 0.012;

/** The accent tint behind selected items stays quiet next to the accent. */
const ACCENT_TINT_CHROMA_LIMIT = 0.045;

/**
 * Raises lightness from `start` until the colour reaches `minimum` contrast
 * against every surface; the surfaces are dark, so lighter reads better.
 */
const lightenUntilReadable = (
  [start, chroma, hue]: OklchColor,
  surfaces: readonly OklchColor[],
  minimum: number,
) => {
  // Contrast is checked on the rounded hex values the page will paint.
  const surfaceRgbs = surfaces.map((surface) => hexToRgb(oklchToHex(surface)));

  for (let lightness = start; lightness < 1; lightness += 0.01) {
    const color = oklchToHex([lightness, chroma, hue]);
    const rgb = hexToRgb(color);

    if (
      surfaceRgbs.every((surface) => contrastRatio(rgb, surface) >= minimum)
    ) {
      return color;
    }
  }

  return "#FFFFFF";
};

const deriveSurfaceTokens = ({
  hue,
  lightness,
  chroma,
}: CustomThemeSurface): CustomThemeTokens => {
  const surface = (offset: number): OklchColor => [
    lightness + offset,
    chroma,
    hue,
  ];

  const tokens: CustomThemeTokens = Object.fromEntries(
    Object.entries(SURFACE_LADDER).map(([token, offset]) => [
      token,
      oklchToHex(surface(offset)),
    ]),
  );

  const textChroma = Math.min(chroma, TEXT_CHROMA_LIMIT);
  // Text must read on the lightest surface it sits on, not only the page.

  const textSurfaces = [
    surface(SURFACE_LADDER.sidebar),
    surface(SURFACE_LADDER.background),
    surface(SURFACE_LADDER.secondary),
  ];

  const foreground = lightenUntilReadable(
    [0.86, textChroma, hue],
    textSurfaces,
    BODY_TEXT_CONTRAST,
  );

  const supporting = lightenUntilReadable(
    [0.68, textChroma, hue],
    [...textSurfaces, surface(SURFACE_LADDER.muted)],
    SUPPORTING_TEXT_CONTRAST,
  );

  return {
    ...tokens,
    foreground,
    "card-foreground": foreground,
    "popover-foreground": foreground,
    "secondary-foreground": foreground,
    "sidebar-foreground": foreground,
    "sidebar-accent-foreground": foreground,
    "accent-foreground": foreground,
    "muted-foreground": supporting,
    "text-supporting": supporting,
  };
};

/**
 * Text on the accent: the darkest surface when it reads, otherwise
 * near-white. A mid-tone accent can defeat both, so pure black or white
 * settles it; one of them always clears 4.5:1.
 */
const deriveAccentForeground = (accent: string, darkSurface: OklchColor) => {
  const accentRgb = hexToRgb(accent);

  const contrastWith = (color: string) =>
    contrastRatio(accentRgb, hexToRgb(color));

  const readable = [oklchToHex(darkSurface), "#FAFAFA"].find(
    (color) => contrastWith(color) >= SUPPORTING_TEXT_CONTRAST,
  );

  if (readable) return readable;

  return contrastWith("#000000") >= contrastWith("#FFFFFF")
    ? "#000000"
    : "#FFFFFF";
};

/** The surface a theme without its own surface knob is assumed to use. */
const DEFAULT_SURFACE: CustomThemeSurface = {
  hue: 250,
  lightness: 0.17,
  chroma: 0.004,
};

const deriveAccentTokens = (
  accent: string,
  surface: CustomThemeSurface,
): CustomThemeTokens => {
  const [, accentChroma, accentHue] = rgbToOklch(hexToRgb(accent));

  const foreground = deriveAccentForeground(accent, [
    surface.lightness + SURFACE_LADDER.sidebar,
    surface.chroma,
    surface.hue,
  ]);

  const tint = oklchToHex([
    surface.lightness + SURFACE_LADDER["sidebar-accent"],
    Math.min(accentChroma, ACCENT_TINT_CHROMA_LIMIT),
    accentHue,
  ]);

  return {
    primary: accent,
    "primary-foreground": foreground,
    ring: accent,
    "sidebar-primary": accent,
    "sidebar-primary-foreground": foreground,
    "sidebar-ring": accent,
    accent: tint,
    "sidebar-accent": tint,
  };
};

/**
 * The colour tokens a custom theme sets over its base theme's stylesheet. A
 * knob left out keeps the base theme's tokens; overrides win over the knobs.
 */
export const deriveCustomThemeTokens = (
  definition: CustomThemeDefinition,
): CustomThemeTokens => ({
  ...(definition.surface && deriveSurfaceTokens(definition.surface)),
  ...(definition.accent &&
    deriveAccentTokens(
      definition.accent,
      definition.surface ?? DEFAULT_SURFACE,
    )),
  ...definition.overrides,
});

/** The tokens a knob derives, read from the derivation itself. */
const tokensDerivedBy = (tokens: CustomThemeTokens) =>
  CUSTOM_THEME_TOKEN_KEYS.filter((token) => token in tokens);

const ACCENT_TOKEN_KEYS = tokensDerivedBy(
  deriveAccentTokens("#808080", DEFAULT_SURFACE),
);

const SURFACE_TOKEN_KEYS = tokensDerivedBy(
  deriveSurfaceTokens(DEFAULT_SURFACE),
);

/**
 * Sets the accent and drops overrides of the tokens it derives, since an
 * override wins over the knob and would hide the new accent.
 */
export const withAccent = (
  definition: CustomThemeDefinition,
  accent: string,
): CustomThemeDefinition => ({
  ...definition,
  accent,
  overrides: omit(definition.overrides, ACCENT_TOKEN_KEYS),
});

/** Sets the surface and drops overrides of the tokens it derives. */
export const withSurface = (
  definition: CustomThemeDefinition,
  surface: CustomThemeSurface,
): CustomThemeDefinition => ({
  ...definition,
  surface,
  overrides: omit(definition.overrides, SURFACE_TOKEN_KEYS),
});

/** Opacity, in percent, of each surface that sits over the wallpaper. */
export type WallpaperCover = {
  /** The background layer over a photo wallpaper. */
  overlay: number;
  /** Tiled list rows, such as loots and timers. */
  listTile: number;
  card: number;
};

/**
 * Cover at no, the default, and full wallpaper visibility. The middle matches
 * the shipped themes; rows and cards stop at 60% so text stays readable over
 * a bright wallpaper.
 */
const COVER_STOPS: Record<keyof WallpaperCover, [number, number, number]> = {
  overlay: [95, 78, 45],
  listTile: [97, 88, 60],
  card: [97, 85, 60],
};

const interpolate = (
  [hidden, middle, shown]: [number, number, number],
  at: number,
) =>
  at <= 50
    ? hidden + ((middle - hidden) * at) / 50
    : middle + ((shown - middle) * (at - 50)) / 50;

/** How opaque the surfaces over the wallpaper are at a visibility of 0–100. */
export const deriveWallpaperCover = (visibility: number): WallpaperCover => ({
  overlay: Math.round(interpolate(COVER_STOPS.overlay, visibility)),
  listTile: Math.round(interpolate(COVER_STOPS.listTile, visibility)),
  card: Math.round(interpolate(COVER_STOPS.card, visibility)),
});

/** A source of numbers in [0, 1); tests pass a seeded one. */
export type RandomSource = () => number;

const between = (random: RandomSource, minimum: number, maximum: number) =>
  minimum + random() * (maximum - minimum);

const pick = <Item>(random: RandomSource, items: readonly Item[]): Item => {
  const item = items[Math.floor(random() * items.length)];

  if (item === undefined) throw new RangeError("Cannot pick from no items");

  return item;
};

/**
 * Where the background's hue sits relative to the accent's: mostly the same
 * family, sometimes its complement or a neighbour, as palettes that read as
 * one theme usually do.
 */
const BACKGROUND_HUE_SHIFTS = [0, 0, 0, 0, 180, 180, 30, -30] as const;

/**
 * A random but coherent theme over a base: a vivid accent, a dark tinted
 * background in harmony with it, and any wallpaper, font and radius. Every
 * hand-set colour is cleared, so the palette is whole.
 */
export const randomizeCustomTheme = ({
  baseThemeId,
  wallpapers,
  random = Math.random,
}: {
  baseThemeId: BuiltInThemeId;
  /** The wallpapers the client ships, besides the base's and none. */
  wallpapers: readonly string[];
  random?: RandomSource;
}): CustomThemeDefinition => {
  const accentHue = between(random, 0, 360);

  const backgroundHue =
    (accentHue + pick(random, BACKGROUND_HUE_SHIFTS) + 360) % 360;

  return {
    baseThemeId,
    accent: oklchToHex([
      between(random, 0.72, 0.84),
      between(random, 0.11, 0.17),
      accentHue,
    ]),
    surface: {
      hue: Math.round(backgroundHue),
      lightness: Math.round(between(random, 0.13, 0.2) * 100) / 100,
      chroma: Math.round(between(random, 0.008, 0.035) * 1000) / 1000,
    },
    overrides: {},
    wallpaper: pick(random, ["base", "none", ...wallpapers]),
    wallpaperVisibility: Math.round(between(random, 30, 70) / 5) * 5,
    font: pick(random, CUSTOM_THEME_FONT_IDS),
    radius: pick(random, CUSTOM_THEME_RADIUS_STEPS),
  };
};
