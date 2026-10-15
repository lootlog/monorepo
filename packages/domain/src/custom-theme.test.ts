import { describe, expect, test } from "bun:test";
import { contrastRatio, hexToRgb } from "./color.js";
import {
  CustomThemeDefinitionSchema,
  type CustomThemeDefinition,
} from "@lootlog/schema/custom-theme";
import { Schema } from "effect";
import {
  deriveCustomThemeTokens,
  deriveWallpaperCover,
  randomizeCustomTheme,
} from "./custom-theme.js";

const definition = (
  patch: Partial<CustomThemeDefinition>,
): CustomThemeDefinition => ({
  baseThemeId: "muted",
  overrides: {},
  wallpaper: "base",
  font: "geist",
  radius: "default",
  ...patch,
});

const contrast = (left: string | undefined, right: string | undefined) =>
  contrastRatio(hexToRgb(left ?? ""), hexToRgb(right ?? ""));

describe("deriveCustomThemeTokens", () => {
  test("keeps the base theme's tokens for knobs the User left alone", () => {
    expect(deriveCustomThemeTokens(definition({}))).toEqual({});
    expect(
      Object.keys(deriveCustomThemeTokens(definition({ accent: "#C8F135" }))),
    ).not.toContain("background");
  });

  // The knobs range over every surface the editor allows; text must stay
  // readable on all of them, including the brightest, most colourful one.
  test.each([
    { hue: 0, lightness: 0.08, chroma: 0 },
    { hue: 140, lightness: 0.28, chroma: 0.08 },
    { hue: 300, lightness: 0.28, chroma: 0.08 },
    { hue: 60, lightness: 0.2, chroma: 0.05 },
  ])("keeps text readable on surface %o", (surface) => {
    const tokens = deriveCustomThemeTokens(definition({ surface }));

    for (const background of [
      tokens.sidebar,
      tokens.background,
      tokens.card,
      tokens.secondary,
    ]) {
      expect(contrast(tokens.foreground, background)).toBeGreaterThanOrEqual(7);
      expect(
        contrast(tokens["muted-foreground"], background),
      ).toBeGreaterThanOrEqual(4.5);
    }

    expect(
      contrast(tokens["muted-foreground"], tokens.muted),
    ).toBeGreaterThanOrEqual(4.5);
  });

  test("orders the surfaces as the shipped themes do", () => {
    const tokens = deriveCustomThemeTokens(
      definition({ surface: { hue: 250, lightness: 0.17, chroma: 0.02 } }),
    );

    const luminance = (token: string | undefined) => contrast(token, "#000000");

    expect(luminance(tokens.sidebar)).toBeLessThan(
      luminance(tokens.background),
    );
    expect(luminance(tokens.background)).toBeLessThan(luminance(tokens.card));
    expect(luminance(tokens.card)).toBeLessThan(luminance(tokens.border));
  });

  test.each(["#FFF59D", "#C8F135", "#5B2A86", "#1E3A8A", "#FF4D4F"])(
    "keeps the label on accent %s readable",
    (accent) => {
      const tokens = deriveCustomThemeTokens(definition({ accent }));

      expect(tokens.primary).toBe(accent);
      expect(
        contrast(tokens["primary-foreground"], accent),
      ).toBeGreaterThanOrEqual(4.5);
    },
  );

  test("lets an override win over a derived token", () => {
    const tokens = deriveCustomThemeTokens(
      definition({
        accent: "#C8F135",
        surface: { hue: 250, lightness: 0.17, chroma: 0.02 },
        overrides: { primary: "#FF0000", border: "#123456" },
      }),
    );

    expect(tokens.primary).toBe("#FF0000");
    expect(tokens.border).toBe("#123456");
    expect(tokens.ring).toBe("#C8F135");
  });
});

describe("deriveWallpaperCover", () => {
  test("matches the shipped themes at the default visibility", () => {
    expect(deriveWallpaperCover(50)).toEqual({
      overlay: 78,
      listTile: 88,
      card: 85,
    });
  });

  // Text sits on rows and cards; a fully shown wallpaper must not wash it out.
  test("keeps rows and cards opaque enough to read at full visibility", () => {
    const cover = deriveWallpaperCover(100);

    expect(cover.listTile).toBeGreaterThanOrEqual(60);
    expect(cover.card).toBeGreaterThanOrEqual(60);
  });

  test("shows more wallpaper as visibility rises", () => {
    const low = deriveWallpaperCover(10);
    const high = deriveWallpaperCover(90);

    expect(high.overlay).toBeLessThan(low.overlay);
    expect(high.listTile).toBeLessThan(low.listTile);
    expect(high.card).toBeLessThan(low.card);
  });
});

/** A small deterministic generator, so each seed gives the same theme. */
const seeded = (seed: number) => {
  let state = seed;

  return () => {
    state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296;

    return state / 4_294_967_296;
  };
};

describe("randomizeCustomTheme", () => {
  const themes = Array.from({ length: 200 }, (_, seed) =>
    randomizeCustomTheme({
      baseThemeId: "muted",
      wallpapers: ["fantasy-castle", "season-winter"],
      random: seeded(seed + 1),
    }),
  );

  // A random theme is saved like any other; the API must accept every one.
  test("always produces a theme the API accepts", () => {
    for (const theme of themes) {
      expect(Schema.is(CustomThemeDefinitionSchema)(theme)).toBe(true);
    }
  });

  // "Sensible" means readable: the accent must stand out from the page and
  // its label must read on it, whatever the dice gave.
  test("keeps the accent visible and its label readable", () => {
    for (const theme of themes) {
      const tokens = deriveCustomThemeTokens(theme);

      expect(
        contrast(tokens.primary, tokens.background),
      ).toBeGreaterThanOrEqual(3);
      expect(
        contrast(tokens["primary-foreground"], tokens.primary),
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  test("varies the accent, wallpaper, font and radius", () => {
    expect(new Set(themes.map(({ accent }) => accent)).size).toBeGreaterThan(
      150,
    );
    expect(new Set(themes.map(({ wallpaper }) => wallpaper)).size).toBe(4);
    expect(new Set(themes.map(({ font }) => font)).size).toBe(8);
    expect(new Set(themes.map(({ radius }) => radius)).size).toBe(5);
  });
});
