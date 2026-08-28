import {
  getThemeRecipeComponents,
  type ThemeConfigV1,
  type ThemePresetId,
} from "@lootlog/types";
import {
  getContrastRatio,
  getReadableForeground,
  mixHexColors,
} from "./theme-colors";

type ThemeTokens = ThemeConfigV1["tokens"];

interface PaletteRecipe {
  primary: string;
  accent: string;
  signal: string;
  background?: string;
}

interface SurfaceProfile {
  card: number;
  popover: number;
  secondary: number;
}

const STANDARD_SURFACE_PROFILE = {
  card: 0.04,
  popover: 0.07,
  secondary: 0.11,
} satisfies SurfaceProfile;

const SPECIAL_SURFACE_PROFILE = {
  card: 0.09,
  popover: 0.11,
  secondary: 0.15,
} satisfies SurfaceProfile;

const createReadableSurface = (color: string) => {
  const foreground = getReadableForeground(color);
  if (getContrastRatio(color, foreground) >= 4.5) {
    return { color, foreground };
  }

  const adjustment = foreground === "#f7f8f2" ? "#000000" : "#ffffff";
  let adjustedColor = color;
  for (let step = 0; step < 10; step += 1) {
    adjustedColor = mixHexColors(adjustedColor, adjustment, 0.08);
    if (getContrastRatio(adjustedColor, foreground) >= 4.5) {
      break;
    }
  }
  return { color: adjustedColor, foreground };
};

const ensureStateContrast = (color: string, foreground: string) => {
  if (getContrastRatio(color, foreground) >= 4.5) return color;
  const adjustment = foreground === "#f7f8f2" ? "#000000" : "#ffffff";
  let adjustedColor = color;
  for (let step = 0; step < 10; step += 1) {
    adjustedColor = mixHexColors(adjustedColor, adjustment, 0.08);
    if (getContrastRatio(adjustedColor, foreground) >= 4.5) break;
  }
  return adjustedColor;
};

const createThemeTokensForProfile = (
  { primary, accent, signal, background = "#07111f" }: PaletteRecipe,
  surfaceProfile: SurfaceProfile,
): ThemeTokens => {
  const foreground = "#f7f8f2";
  const card = mixHexColors(background, primary, surfaceProfile.card);
  const secondary = mixHexColors(background, primary, surfaceProfile.secondary);
  const muted = mixHexColors(background, foreground, 0.11);
  const mutedForeground = mixHexColors(background, foreground, 0.7);
  const ring = getContrastRatio(accent, background) >= 3 ? accent : foreground;
  const primarySurface = createReadableSurface(primary);
  const accentSurface = createReadableSurface(accent);
  const destructiveSurface = createReadableSurface("#ff665b");

  return {
    background,
    foreground,
    card,
    cardForeground: foreground,
    popover: mixHexColors(background, primary, surfaceProfile.popover),
    popoverForeground: foreground,
    primary: primarySurface.color,
    primaryForeground: primarySurface.foreground,
    secondary,
    secondaryForeground: foreground,
    muted,
    mutedForeground,
    accent: accentSurface.color,
    accentForeground: accentSurface.foreground,
    destructive: destructiveSurface.color,
    destructiveForeground: destructiveSurface.foreground,
    border: mixHexColors(background, foreground, 0.19),
    input: mixHexColors(background, foreground, 0.25),
    ring,
    sidebar: mixHexColors(background, "#000000", 0.14),
    sidebarForeground: foreground,
    sidebarPrimary: primarySurface.color,
    sidebarPrimaryForeground: primarySurface.foreground,
    sidebarAccent: secondary,
    sidebarAccentForeground: foreground,
    sidebarBorder: mixHexColors(background, foreground, 0.16),
    sidebarRing: ring,
    signalLive: accent,
    signalReady: signal,
    signalTimer: "#ffbd3f",
    signalAlert: "#ff665b",
    primaryHover: ensureStateContrast(
      mixHexColors(primarySurface.color, primarySurface.foreground, 0.06),
      primarySurface.foreground,
    ),
    primaryActive: ensureStateContrast(
      mixHexColors(primarySurface.color, "#000000", 0.16),
      primarySurface.foreground,
    ),
    secondaryHover: mixHexColors(secondary, foreground, 0.08),
    secondaryActive: mixHexColors(secondary, foreground, 0.14),
    neutralHover: mixHexColors(background, foreground, 0.16),
    neutralActive: mixHexColors(background, foreground, 0.22),
    destructiveHover: ensureStateContrast(
      mixHexColors(
        destructiveSurface.color,
        destructiveSurface.foreground,
        0.06,
      ),
      destructiveSurface.foreground,
    ),
    destructiveActive: ensureStateContrast(
      mixHexColors(destructiveSurface.color, "#000000", 0.16),
      destructiveSurface.foreground,
    ),
    surfaceHover: mixHexColors(card, foreground, 0.06),
    surfaceSelected: mixHexColors(card, primarySurface.color, 0.18),
    inputHover: mixHexColors(background, foreground, 0.3),
    inputFocus: ring,
    sidebarHover: mixHexColors(secondary, foreground, 0.08),
    sidebarActive: primarySurface.color,
    shadow: "#000000",
  };
};

export const createThemeTokens = (palette: PaletteRecipe): ThemeTokens =>
  createThemeTokensForProfile(palette, STANDARD_SURFACE_PROFILE);

const createConfig = (
  palette: PaletteRecipe,
  axes: Omit<ThemeConfigV1, "version" | "tokens" | "charts">,
  surfaceProfile: SurfaceProfile = STANDARD_SURFACE_PROFILE,
): ThemeConfigV1 => ({
  version: 1,
  tokens: createThemeTokensForProfile(palette, surfaceProfile),
  charts: [
    palette.primary,
    palette.accent,
    palette.signal,
    "#ffbd3f",
    "#ff665b",
  ],
  ...axes,
});

const signalFlat = {
  recipe: "signal",
  components: getThemeRecipeComponents("signal"),
  radius: "default",
  density: "standard",
  surface: "flat",
  border: "subtle",
  typography: {
    heading: "geist",
    body: "geist",
    headingWeight: "semibold",
    bodyWeight: "regular",
    tracking: "normal",
  },
  navigation: { surface: "solid", active: "filled" },
  chartStyle: { grid: "subtle", stroke: "default", fill: "soft" },
  motion: "standard",
} as const;

const outlineCompact = {
  recipe: "outline",
  components: getThemeRecipeComponents("outline"),
  radius: "sharp",
  density: "compact",
  surface: "flat",
  border: "strong",
  typography: {
    heading: "geist",
    body: "inter",
    headingWeight: "bold",
    bodyWeight: "regular",
    tracking: "tight",
  },
  navigation: { surface: "subtle", active: "line" },
  chartStyle: { grid: "strong", stroke: "thin", fill: "none" },
  motion: "expressive",
} as const;

const softComfortable = {
  recipe: "soft",
  components: getThemeRecipeComponents("soft"),
  radius: "round",
  density: "comfortable",
  surface: "raised",
  border: "none",
  typography: {
    heading: "manrope",
    body: "inter",
    headingWeight: "semibold",
    bodyWeight: "regular",
    tracking: "normal",
  },
  navigation: { surface: "subtle", active: "filled" },
  chartStyle: { grid: "hidden", stroke: "default", fill: "soft" },
  motion: "standard",
} as const;

const solidRaised = {
  recipe: "solid",
  components: getThemeRecipeComponents("solid"),
  radius: "default",
  density: "standard",
  surface: "raised",
  border: "subtle",
  typography: {
    heading: "manrope",
    body: "geist",
    headingWeight: "bold",
    bodyWeight: "medium",
    tracking: "normal",
  },
  navigation: { surface: "solid", active: "filled" },
  chartStyle: { grid: "subtle", stroke: "bold", fill: "soft" },
  motion: "expressive",
} as const;

const solidCompact = {
  recipe: "solid",
  components: getThemeRecipeComponents("solid"),
  radius: "compact",
  density: "compact",
  surface: "flat",
  border: "strong",
  typography: {
    heading: "inter",
    body: "inter",
    headingWeight: "semibold",
    bodyWeight: "medium",
    tracking: "tight",
  },
  navigation: { surface: "solid", active: "line" },
  chartStyle: { grid: "subtle", stroke: "thin", fill: "none" },
  motion: "quiet",
} as const;

export const PRESET_THEME_CONFIGS = {
  default: createConfig(
    { primary: "#3157f6", accent: "#35d3e4", signal: "#c8f135" },
    signalFlat,
  ),
  onepiece: createConfig(
    {
      primary: "#2d8659",
      accent: "#7fd99a",
      signal: "#b9ee72",
      background: "#06150f",
    },
    signalFlat,
  ),
  cyberpunk: createConfig(
    {
      primary: "#ff1493",
      accent: "#00f0ff",
      signal: "#c8f135",
      background: "#12091d",
    },
    outlineCompact,
  ),
  goth: createConfig(
    {
      primary: "#8b1a3d",
      accent: "#a050d0",
      signal: "#d4a5ff",
      background: "#09080c",
    },
    outlineCompact,
  ),
  pastel: createConfig(
    {
      primary: "#ffb3d9",
      accent: "#b4e7ce",
      signal: "#e0bbe4",
      background: "#171422",
    },
    softComfortable,
  ),
  anime: createConfig(
    {
      primary: "#f4c542",
      accent: "#ff6b8a",
      signal: "#ffb347",
      background: "#17120a",
    },
    softComfortable,
  ),
  waguri: createConfig(
    {
      primary: "#ff69b4",
      accent: "#b980ff",
      signal: "#ffb6c1",
      background: "#180d19",
    },
    softComfortable,
  ),
  fantasy: createConfig(
    {
      primary: "#7e3f87",
      accent: "#ffd700",
      signal: "#d9a3ff",
      background: "#120814",
    },
    solidRaised,
  ),
  shonen: createConfig(
    {
      primary: "#ff6b35",
      accent: "#00a8e8",
      signal: "#ffd23f",
      background: "#170d08",
    },
    solidRaised,
  ),
  halloween: createConfig(
    {
      primary: "#ff8c1a",
      accent: "#ffd9b3",
      signal: "#b96cff",
      background: "#110b07",
    },
    solidRaised,
  ),
  realmadrid: createConfig(
    {
      primary: "#496a94",
      accent: "#ffffff",
      signal: "#b9d6ff",
      background: "#07111f",
    },
    solidCompact,
  ),
  "realmadrid-3rd": createConfig(
    {
      primary: "#7b3ff2",
      accent: "#e6d9ff",
      signal: "#ffffff",
      background: "#110b20",
    },
    solidCompact,
  ),
  barcelona: createConfig(
    {
      primary: "#b51d55",
      accent: "#3c7fc4",
      signal: "#f2c84b",
      background: "#120714",
    },
    solidCompact,
  ),
  rukia: createConfig(
    {
      primary: "#b8d4e8",
      accent: "#9b7bb8",
      signal: "#e8f4ff",
      background: "#09131d",
    },
    { ...softComfortable, motion: "expressive" },
    SPECIAL_SURFACE_PROFILE,
  ),
  rias: createConfig(
    {
      primary: "#c41e3a",
      accent: "#a95791",
      signal: "#f1a0b2",
      background: "#12070e",
    },
    solidRaised,
    SPECIAL_SURFACE_PROFILE,
  ),
  "cat-pink": createConfig(
    {
      primary: "#f4b8c8",
      accent: "#e8a0b4",
      signal: "#fddde6",
      background: "#180f15",
    },
    softComfortable,
    SPECIAL_SURFACE_PROFILE,
  ),
  "cat-purple": createConfig(
    {
      primary: "#c9aed6",
      accent: "#b499c7",
      signal: "#e2d1eb",
      background: "#140f18",
    },
    softComfortable,
    SPECIAL_SURFACE_PROFILE,
  ),
  "cat-blue": createConfig(
    {
      primary: "#a8cfe0",
      accent: "#8fbdd0",
      signal: "#d0e8f2",
      background: "#0c1418",
    },
    softComfortable,
    SPECIAL_SURFACE_PROFILE,
  ),
  "cat-random": createConfig(
    {
      primary: "#f4b8c8",
      accent: "#c9aed6",
      signal: "#a8cfe0",
      background: "#150f18",
    },
    softComfortable,
    SPECIAL_SURFACE_PROFILE,
  ),
} satisfies Record<ThemePresetId, ThemeConfigV1>;
