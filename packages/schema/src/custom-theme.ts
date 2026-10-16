import { Option, Schema } from "effect";

/** Built-in web themes; `cat-random` picks one cat variant per visit. */
export const BUILT_IN_THEME_IDS = [
  "default",
  "muted",
  "cyberpunk",
  "pastel",
  "fantasy",
  "shonen",
  "onepiece",
  "anime",
  "waguri",
  "goth",
  "halloween",
  "realmadrid",
  "realmadrid-3rd",
  "barcelona",
  "rukia",
  "rias",
  "cat-pink",
  "cat-purple",
  "cat-blue",
  "cat-random",
] as const;

export const BuiltInThemeIdSchema = Schema.Literals(BUILT_IN_THEME_IDS);

export type BuiltInThemeId = typeof BuiltInThemeIdSchema.Type;

export const CUSTOM_THEME_LIMIT = 10;

export const CUSTOM_THEME_NAME_MAX_LENGTH = 40;

/** A stored theme preference that points at one of the User's own themes. */
export const CUSTOM_THEME_PREFERENCE_PREFIX = "custom:";

export const CustomThemePreferenceSchema = Schema.String.check(
  Schema.isPattern(
    // Only the `u` flag: JSON Schema exports drop a pattern with other flags.
    /^custom:[\dA-Fa-f]{8}-[\dA-Fa-f]{4}-[\dA-Fa-f]{4}-[\dA-Fa-f]{4}-[\dA-Fa-f]{12}$/u,
  ),
);

export const ThemePreferenceSchema = Schema.Union([
  BuiltInThemeIdSchema,
  CustomThemePreferenceSchema,
]);

export const CUSTOM_THEME_FONT_IDS = [
  "geist",
  "inter",
  "mona-sans",
  "ibm-plex-sans",
  "nunito",
  "space-grotesk",
  "lexend",
  "atkinson-hyperlegible",
] as const;

export const CustomThemeFontIdSchema = Schema.Literals(CUSTOM_THEME_FONT_IDS);

export type CustomThemeFontId = typeof CustomThemeFontIdSchema.Type;

export const CUSTOM_THEME_RADIUS_STEPS = [
  "sharp",
  "soft",
  "default",
  "round",
  "pill",
] as const;

export const CustomThemeRadiusSchema = Schema.Literals(
  CUSTOM_THEME_RADIUS_STEPS,
);

export type CustomThemeRadius = typeof CustomThemeRadiusSchema.Type;

/** Every colour token a theme sets; the advanced editor overrides any of them. */
export const CUSTOM_THEME_TOKEN_KEYS = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "destructive-foreground",
  "border",
  "separator",
  "ring",
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
  "signal-live",
  "signal-ready",
  "signal-timer",
  "signal-alert",
  "text-supporting",
  "sidebar",
  "sidebar-foreground",
  "sidebar-primary",
  "sidebar-primary-foreground",
  "sidebar-accent",
  "sidebar-accent-foreground",
  "sidebar-ring",
] as const;

export const CustomThemeTokenKeySchema = Schema.Literals(
  CUSTOM_THEME_TOKEN_KEYS,
);

export type CustomThemeTokenKey = typeof CustomThemeTokenKeySchema.Type;

export const HexColorSchema = Schema.String.check(
  Schema.isPattern(/^#[\dA-Fa-f]{6}$/u),
);

/** The content surfaces' hue, lightness and colourfulness, in OKLCH terms. */
export const CustomThemeSurfaceSchema = Schema.Struct({
  hue: Schema.Finite.check(Schema.isBetween({ minimum: 0, maximum: 360 })),
  lightness: Schema.Finite.check(
    Schema.isBetween({ minimum: 0.08, maximum: 0.28 }),
  ),
  chroma: Schema.Finite.check(Schema.isBetween({ minimum: 0, maximum: 0.08 })),
});

export type CustomThemeSurface = typeof CustomThemeSurfaceSchema.Type;

/**
 * `base` keeps the base theme's wallpaper and `none` shows none; any other
 * value names a wallpaper the Web app ships, and an unknown one shows none.
 */
export const CustomThemeWallpaperSchema = Schema.String.check(
  Schema.isPattern(/^[a-z\d-]{1,48}$/u),
);

/**
 * A User's theme: a built-in base plus what they changed. A knob left out
 * keeps the base theme's colours; overrides win over everything.
 */
export const CustomThemeDefinitionSchema = Schema.Struct({
  baseThemeId: BuiltInThemeIdSchema,
  accent: Schema.optionalKey(HexColorSchema),
  surface: Schema.optionalKey(CustomThemeSurfaceSchema),
  overrides: Schema.Record(
    CustomThemeTokenKeySchema,
    Schema.optionalKey(HexColorSchema),
  ),
  wallpaper: CustomThemeWallpaperSchema,
  /** How much the wallpaper shows through, 0–100; left out keeps the base's. */
  wallpaperVisibility: Schema.optionalKey(
    Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: 100 })),
  ),
  font: CustomThemeFontIdSchema,
  radius: CustomThemeRadiusSchema,
});

export type CustomThemeDefinition = typeof CustomThemeDefinitionSchema.Type;

export const CustomThemeNameSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(CUSTOM_THEME_NAME_MAX_LENGTH),
);

const CachedCustomThemeSchema = Schema.fromJsonString(
  Schema.Struct({ id: Schema.String, definition: CustomThemeDefinitionSchema }),
);

const decodeCachedCustomTheme = Schema.decodeUnknownOption(
  CachedCustomThemeSchema,
);

/** Reads a custom theme cached as JSON; anything malformed reads as `null`. */
export const parseCachedCustomTheme = (json: string | null) =>
  Option.getOrNull(decodeCachedCustomTheme(json));
