import type {
  BuiltInThemeId,
  CustomThemeDefinition,
  CustomThemeRadius,
} from "@lootlog/schema/custom-theme";
import { deriveCustomThemeTokens } from "@lootlog/domain/custom-theme";
import { THEME_CATALOG } from "@lootlog/ui/themes/catalog";
import { findWallpaper } from "@lootlog/ui/themes/wallpapers";

/** What a theme's row shows: its wallpaper, or a plain fill, and palette. */
export interface ThemePreview {
  image: string | null;
  color: string;
  /** Accent, highlight and background, as the built-in themes list them. */
  colors: [string, string, string];
  /** The theme's control rounding, which the palette swatches take on. */
  radius: CustomThemeRadius;
}

const FALLBACK_COLORS: ThemePreview["colors"] = [
  "#C8F135",
  "#273321",
  "#07111F",
];

export const getBuiltInThemePreview = (
  themeId: BuiltInThemeId,
): ThemePreview => {
  const entry = THEME_CATALOG.find(({ name }) => name === themeId);
  const [accent, highlight, background] = entry?.colors ?? FALLBACK_COLORS;

  const colors: ThemePreview["colors"] = [
    accent ?? FALLBACK_COLORS[0],
    highlight ?? FALLBACK_COLORS[1],
    background ?? FALLBACK_COLORS[2],
  ];

  return {
    image: entry?.backgroundImage ?? null,
    color: colors[2],
    colors,
    radius: entry?.radius ?? "default",
  };
};

export const getCustomThemePreview = (
  definition: CustomThemeDefinition,
): ThemePreview => {
  const base = getBuiltInThemePreview(definition.baseThemeId);
  const tokens = deriveCustomThemeTokens(definition);
  const background = tokens.background ?? base.colors[2];

  const image =
    definition.wallpaper === "base"
      ? base.image
      : (findWallpaper(definition.wallpaper)?.preview ?? null);

  return {
    image,
    color: background,
    colors: [
      tokens.primary ?? base.colors[0],
      tokens["sidebar-accent"] ?? base.colors[1],
      background,
    ],
    radius: definition.radius,
  };
};
