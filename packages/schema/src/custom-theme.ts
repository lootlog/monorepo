import { Option, Schema } from "effect";

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

export const CUSTOM_THEME_PREFERENCE_PREFIX = "custom:";

const CustomThemePreferenceSchema = Schema.String.check(
  Schema.isPattern(
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

const CustomThemeFontIdSchema = Schema.Literals(CUSTOM_THEME_FONT_IDS);

export type CustomThemeFontId = typeof CustomThemeFontIdSchema.Type;

export const CUSTOM_THEME_RADIUS_STEPS = [
  "sharp",
  "soft",
  "default",
  "round",
  "pill",
] as const;

const CustomThemeRadiusSchema = Schema.Literals(CUSTOM_THEME_RADIUS_STEPS);

export type CustomThemeRadius = typeof CustomThemeRadiusSchema.Type;

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

const CustomThemeTokenKeySchema = Schema.Literals(CUSTOM_THEME_TOKEN_KEYS);

export type CustomThemeTokenKey = typeof CustomThemeTokenKeySchema.Type;

const HexColorSchema = Schema.String.check(
  Schema.isPattern(/^#[\dA-Fa-f]{6}$/u),
);

const CustomThemeSurfaceSchema = Schema.Struct({
  hue: Schema.Finite.check(Schema.isBetween({ minimum: 0, maximum: 360 })),
  lightness: Schema.Finite.check(
    Schema.isBetween({ minimum: 0.08, maximum: 0.28 }),
  ),
  chroma: Schema.Finite.check(Schema.isBetween({ minimum: 0, maximum: 0.08 })),
});

export type CustomThemeSurface = typeof CustomThemeSurfaceSchema.Type;

const CustomThemeWallpaperSchema = Schema.String.check(
  Schema.isPattern(/^[a-z\d-]{1,48}$/u),
);

export const CustomThemeDefinitionSchema = Schema.Struct({
  baseThemeId: BuiltInThemeIdSchema,
  accent: Schema.optionalKey(HexColorSchema),
  surface: Schema.optionalKey(CustomThemeSurfaceSchema),
  overrides: Schema.Record(
    CustomThemeTokenKeySchema,
    Schema.optionalKey(HexColorSchema),
  ),
  wallpaper: CustomThemeWallpaperSchema,
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

export const parseCachedCustomTheme = (json: string | null) =>
  Option.getOrNull(decodeCachedCustomTheme(json));
