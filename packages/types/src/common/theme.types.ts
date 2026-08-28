import { z } from "zod";

export const THEME_CONFIG_VERSION = 1 as const;
export const THEME_LIBRARY_LIMIT = 20;
export const PORTABLE_THEME_MAX_BYTES = 64 * 1024;

export const THEME_PRESET_IDS = [
  "default",
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

export const SPECIAL_THEME_IDS = [
  "rukia",
  "rias",
  "cat-pink",
  "cat-purple",
  "cat-blue",
  "cat-random",
] as const;

export const ThemePresetIdSchema = z.enum(THEME_PRESET_IDS);
export const SpecialThemeIdSchema = z.enum(SPECIAL_THEME_IDS);

const hexColorSchema = z
  .string()
  .regex(/^#[\da-f]{6}$/i, "Expected a six-digit hexadecimal color");

const CurrentDraftThemeTokensV1Schema = z
  .object({
    background: hexColorSchema,
    foreground: hexColorSchema,
    card: hexColorSchema,
    cardForeground: hexColorSchema,
    popover: hexColorSchema,
    popoverForeground: hexColorSchema,
    primary: hexColorSchema,
    primaryForeground: hexColorSchema,
    secondary: hexColorSchema,
    secondaryForeground: hexColorSchema,
    muted: hexColorSchema,
    mutedForeground: hexColorSchema,
    accent: hexColorSchema,
    accentForeground: hexColorSchema,
    destructive: hexColorSchema,
    destructiveForeground: hexColorSchema,
    border: hexColorSchema,
    input: hexColorSchema,
    ring: hexColorSchema,
    sidebar: hexColorSchema,
    sidebarForeground: hexColorSchema,
    sidebarPrimary: hexColorSchema,
    sidebarPrimaryForeground: hexColorSchema,
    sidebarAccent: hexColorSchema,
    sidebarAccentForeground: hexColorSchema,
    sidebarBorder: hexColorSchema,
    sidebarRing: hexColorSchema,
    signalLive: hexColorSchema,
    signalReady: hexColorSchema,
    signalTimer: hexColorSchema,
    signalAlert: hexColorSchema,
  })
  .strict();

export const ThemeTokensSchema = CurrentDraftThemeTokensV1Schema.extend({
  primaryHover: hexColorSchema,
  primaryActive: hexColorSchema,
  secondaryHover: hexColorSchema,
  secondaryActive: hexColorSchema,
  neutralHover: hexColorSchema,
  neutralActive: hexColorSchema,
  destructiveHover: hexColorSchema,
  destructiveActive: hexColorSchema,
  surfaceHover: hexColorSchema,
  surfaceSelected: hexColorSchema,
  inputHover: hexColorSchema,
  inputFocus: hexColorSchema,
  sidebarHover: hexColorSchema,
  sidebarActive: hexColorSchema,
  shadow: hexColorSchema,
}).strict();

export const ThemeDensitySchema = z.enum([
  "compact",
  "standard",
  "comfortable",
]);
export const ThemeMotionSchema = z.enum(["quiet", "standard", "expressive"]);
export const ThemeFontSchema = z.enum(["geist", "inter", "manrope"]);
export const ThemeRecipeSchema = z.enum([
  "signal",
  "solid",
  "soft",
  "outline",
  "custom",
]);
export const ThemeComponentsSchema = z
  .object({
    button: z.enum(["solid", "soft", "outline", "minimal"]),
    card: z.enum(["solid", "soft", "outline"]),
    input: z.enum(["outline", "filled", "underline"]),
    badge: z.enum(["solid", "soft", "outline"]),
    table: z.enum(["plain", "striped", "separated"]),
  })
  .strict();
export const ThemeBorderSchema = z.enum(["none", "subtle", "strong"]);
export const ThemeSurfaceSchema = z.enum(["flat", "raised", "floating"]);
export const ThemeHeadingWeightSchema = z.enum(["medium", "semibold", "bold"]);
export const ThemeBodyWeightSchema = z.enum(["regular", "medium"]);
export const ThemeTrackingSchema = z.enum(["tight", "normal", "relaxed"]);
export const ThemeChartStyleSchema = z
  .object({
    grid: z.enum(["hidden", "subtle", "strong"]),
    stroke: z.enum(["thin", "default", "bold"]),
    fill: z.enum(["none", "soft"]),
  })
  .strict();

export type ThemeComponents = z.infer<typeof ThemeComponentsSchema>;
export type ThemeRecipe = z.infer<typeof ThemeRecipeSchema>;

const THEME_RECIPE_COMPONENTS = {
  signal: {
    button: "solid",
    card: "outline",
    input: "outline",
    badge: "solid",
    table: "separated",
  },
  solid: {
    button: "solid",
    card: "solid",
    input: "filled",
    badge: "solid",
    table: "striped",
  },
  soft: {
    button: "soft",
    card: "soft",
    input: "filled",
    badge: "soft",
    table: "plain",
  },
  outline: {
    button: "outline",
    card: "outline",
    input: "outline",
    badge: "outline",
    table: "separated",
  },
} as const satisfies Record<Exclude<ThemeRecipe, "custom">, ThemeComponents>;

export const getThemeRecipeComponents = (
  recipe: Exclude<ThemeRecipe, "custom">,
): ThemeComponents => ({ ...THEME_RECIPE_COMPONENTS[recipe] });

const ThemeTypographySchema = z
  .object({
    heading: ThemeFontSchema,
    body: ThemeFontSchema,
    headingWeight: ThemeHeadingWeightSchema,
    bodyWeight: ThemeBodyWeightSchema,
    tracking: ThemeTrackingSchema,
  })
  .strict();

const ThemeNavigationSchema = z
  .object({
    surface: z.enum(["solid", "subtle"]),
    active: z.enum(["filled", "line"]),
  })
  .strict();

export const ThemeConfigV1Schema = z
  .object({
    version: z.literal(THEME_CONFIG_VERSION),
    tokens: ThemeTokensSchema,
    recipe: ThemeRecipeSchema,
    components: ThemeComponentsSchema,
    radius: z.enum(["sharp", "compact", "default", "round"]),
    density: ThemeDensitySchema,
    surface: ThemeSurfaceSchema,
    border: ThemeBorderSchema,
    typography: ThemeTypographySchema,
    navigation: ThemeNavigationSchema,
    charts: z.array(hexColorSchema).length(5),
    chartStyle: ThemeChartStyleSchema,
    motion: ThemeMotionSchema,
  })
  .strict();

const CurrentDraftThemeConfigV1Schema = z
  .object({
    version: z.literal(THEME_CONFIG_VERSION),
    tokens: CurrentDraftThemeTokensV1Schema,
    recipe: z.enum(["signal", "solid", "soft", "outline"]),
    radius: z.enum(["sharp", "compact", "default", "round"]),
    density: ThemeDensitySchema,
    surface: z.enum(["flat", "raised"]),
    typography: z
      .object({
        heading: ThemeFontSchema,
        body: ThemeFontSchema,
      })
      .strict(),
    navigation: ThemeNavigationSchema,
    charts: z.array(hexColorSchema).length(5),
    motion: ThemeMotionSchema,
  })
  .strict();

export type ThemeConfigV1 = z.infer<typeof ThemeConfigV1Schema>;
export type ThemePresetId = z.infer<typeof ThemePresetIdSchema>;
export type SpecialThemeId = z.infer<typeof SpecialThemeIdSchema>;
export type ThemeDensity = z.infer<typeof ThemeDensitySchema>;
export type ThemeMotion = z.infer<typeof ThemeMotionSchema>;

export const normalizeThemeConfigV1 = (
  value: unknown,
): ThemeConfigV1 | null => {
  const finalConfig = ThemeConfigV1Schema.safeParse(value);
  if (finalConfig.success) {
    return finalConfig.data;
  }

  const currentDraft = CurrentDraftThemeConfigV1Schema.safeParse(value);
  if (!currentDraft.success) {
    return null;
  }

  const { tokens, typography, recipe } = currentDraft.data;
  return ThemeConfigV1Schema.parse({
    ...currentDraft.data,
    tokens: {
      ...tokens,
      primaryHover: tokens.primary,
      primaryActive: tokens.primary,
      secondaryHover: tokens.secondary,
      secondaryActive: tokens.secondary,
      neutralHover: tokens.muted,
      neutralActive: tokens.secondary,
      destructiveHover: tokens.destructive,
      destructiveActive: tokens.destructive,
      surfaceHover: tokens.secondary,
      surfaceSelected: tokens.accent,
      inputHover: tokens.input,
      inputFocus: tokens.ring,
      sidebarHover: tokens.sidebarAccent,
      sidebarActive: tokens.sidebarPrimary,
      shadow: "#000000",
    },
    components: getThemeRecipeComponents(recipe),
    border: "subtle",
    typography: {
      ...typography,
      headingWeight: "semibold",
      bodyWeight: "regular",
      tracking: "normal",
    },
    chartStyle: { grid: "subtle", stroke: "default", fill: "soft" },
  });
};

export const ThemeSelectionSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("preset"),
      presetId: ThemePresetIdSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("custom"),
      themeId: z.string().trim().min(1).max(64),
    })
    .strict(),
]);

export type ThemeSelection = z.infer<typeof ThemeSelectionSchema>;

export const CustomThemeSchema = z
  .object({
    id: z.string().trim().min(1).max(64),
    name: z.string().trim().min(1).max(48),
    config: ThemeConfigV1Schema,
  })
  .strict();

export type CustomTheme = z.infer<typeof CustomThemeSchema>;

export const SpecialThemeOverridesSchema = z
  .object({
    density: ThemeDensitySchema,
    motion: ThemeMotionSchema,
  })
  .strict();

export const ThemeLibrarySchema = z
  .object({
    revision: z.number().int().min(1),
    selection: ThemeSelectionSchema,
    customThemes: z.array(CustomThemeSchema).max(THEME_LIBRARY_LIMIT),
    specialOverrides: z.partialRecord(
      SpecialThemeIdSchema,
      SpecialThemeOverridesSchema,
    ),
  })
  .strict();

export type ThemeLibrary = z.infer<typeof ThemeLibrarySchema>;

const InternalThemeLibraryV1Schema = ThemeLibrarySchema.extend({
  customThemes: z
    .array(
      z
        .object({
          id: z.string().trim().min(1).max(64),
          name: z.string().trim().min(1).max(48),
          config: z.union([
            ThemeConfigV1Schema,
            CurrentDraftThemeConfigV1Schema,
          ]),
        })
        .strict(),
    )
    .max(THEME_LIBRARY_LIMIT),
}).strict();

export const normalizeThemeLibrary = (value: unknown): ThemeLibrary | null => {
  const library = InternalThemeLibraryV1Schema.safeParse(value);
  if (!library.success) {
    return null;
  }

  const customThemes = library.data.customThemes.map((theme) => ({
    ...theme,
    config: normalizeThemeConfigV1(theme.config),
  }));
  if (customThemes.some((theme) => theme.config === null)) {
    return null;
  }

  return ThemeLibrarySchema.parse({
    ...library.data,
    customThemes,
  });
};

export const ThemePatchOperationSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("select"),
      selection: ThemeSelectionSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("upsert"),
      theme: CustomThemeSchema,
      activate: z.boolean().optional().default(false),
    })
    .strict(),
  z
    .object({
      kind: z.literal("delete"),
      themeId: z.string().trim().min(1).max(64),
    })
    .strict(),
  z
    .object({
      kind: z.literal("set-special-overrides"),
      presetId: SpecialThemeIdSchema,
      overrides: SpecialThemeOverridesSchema,
    })
    .strict(),
]);

export const ThemePatchRequestSchema = z
  .object({
    revision: z.number().int().min(1),
    operations: z.array(ThemePatchOperationSchema).min(1).max(50),
  })
  .strict();

export type ThemePatchRequest = z.infer<typeof ThemePatchRequestSchema>;
export type ThemePatchOperation = ThemePatchRequest["operations"][number];

export const PortableThemeSchema = z
  .object({
    format: z.literal("lootlog-theme"),
    version: z.literal(1),
    name: z.string().trim().min(1).max(48),
    config: ThemeConfigV1Schema,
  })
  .strict();

export type PortableTheme = z.infer<typeof PortableThemeSchema>;

export const createDefaultThemeLibrary = (
  presetId: ThemePresetId = "default",
): ThemeLibrary => ({
  revision: 1,
  selection: { kind: "preset", presetId },
  customThemes: [],
  specialOverrides: {},
});

export const isThemePresetId = (value: unknown): value is ThemePresetId =>
  ThemePresetIdSchema.safeParse(value).success;

export const isSpecialThemeId = (value: unknown): value is SpecialThemeId =>
  SpecialThemeIdSchema.safeParse(value).success;
