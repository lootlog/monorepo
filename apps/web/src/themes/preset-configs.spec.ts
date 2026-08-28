import {
  SPECIAL_THEME_IDS,
  type SpecialThemeId,
  type ThemeConfigV1,
  type ThemePresetId,
} from "@lootlog/types";
import { describe, expect, it } from "vitest";
import { getContrastRatio } from "./theme-colors";
import { createThemeTokens, PRESET_THEME_CONFIGS } from "./preset-configs";

type StandardThemeId = Exclude<ThemePresetId, SpecialThemeId>;
type SurfaceTokens = Pick<
  ThemeConfigV1["tokens"],
  "card" | "popover" | "secondary"
>;

const STANDARD_THEME_IDS = [
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
] as const satisfies readonly StandardThemeId[];

const LEGACY_STANDARD_CARD_COLORS = {
  default: "#0b1732",
  cyberpunk: "#270a28",
  pastel: "#2c2232",
  fantasy: "#1c0d1e",
  shonen: "#2c150c",
  onepiece: "#0a1f16",
  anime: "#2b220f",
  waguri: "#2d1527",
  goth: "#150a10",
  halloween: "#261709",
  realmadrid: "#0d192a",
  "realmadrid-3rd": "#1b1033",
  barcelona: "#21091a",
} satisfies Record<StandardThemeId, string>;

const SPECIAL_THEME_SURFACES = {
  rukia: { card: "#19242f", popover: "#1c2833", secondary: "#23303b" },
  rias: { card: "#220912", popover: "#260a13", secondary: "#2d0a15" },
  "cat-pink": {
    card: "#2c1e25",
    popover: "#302229",
    secondary: "#392830",
  },
  "cat-purple": {
    card: "#241d29",
    popover: "#28202d",
    secondary: "#2f2735",
  },
  "cat-blue": {
    card: "#1a252a",
    popover: "#1d292e",
    secondary: "#233036",
  },
  "cat-random": {
    card: "#291e28",
    popover: "#2e222b",
    secondary: "#362832",
  },
} satisfies Record<SpecialThemeId, SurfaceTokens>;

const getSurfaceTokens = (config: ThemeConfigV1): SurfaceTokens => ({
  card: config.tokens.card,
  popover: config.tokens.popover,
  secondary: config.tokens.secondary,
});

describe("preset theme surfaces", () => {
  it("creates the balanced surface ramp for standard themes", () => {
    const tokens = createThemeTokens({
      primary: "#3157f6",
      accent: "#35d3e4",
      signal: "#c8f135",
    });

    expect(tokens).toMatchObject({
      card: "#091428",
      popover: "#0a162e",
      secondary: "#0c1937",
    });
  });

  it("makes every standard preset card quieter than its legacy surface", () => {
    for (const themeId of STANDARD_THEME_IDS) {
      const config = PRESET_THEME_CONFIGS[themeId];
      const background = config.tokens.background;

      expect(
        getContrastRatio(config.tokens.card, background),
        `${themeId} card should sit closer to its canvas`,
      ).toBeLessThan(
        getContrastRatio(LEGACY_STANDARD_CARD_COLORS[themeId], background),
      );
    }
  });

  it("keeps special theme surfaces on their legacy profile", () => {
    for (const themeId of SPECIAL_THEME_IDS) {
      expect(getSurfaceTokens(PRESET_THEME_CONFIGS[themeId])).toEqual(
        SPECIAL_THEME_SURFACES[themeId],
      );
    }
  });
});
