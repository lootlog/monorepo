/**
 * How a timer tile is painted: `accent` is the opaque stripe on its left edge
 * and the swatch colour in pickers, `fill` is the translucent row background.
 * Custom and overridden colours use the same pair under the names
 * `borderColor` and `backgroundColor`.
 */
export type TimerColorPaint = {
  accent: string;
  fill: string;
  hoverFill?: string;
};

const TILE_FILL_ALPHA_HEX = "4d";

const paint = (hex: string): TimerColorPaint => ({
  accent: hex,
  fill: `${hex}${TILE_FILL_ALPHA_HEX}`,
});

/**
 * Built-in colours share one OKLCH lightness and chroma band (yellow and lime
 * sit a little lighter, blue and purple darker to stay apart from sky and
 * violet), so no colour outshines the others behind white text.
 */
export const TIMERS_COLORS = {
  red: paint("#d86e67"),
  orange: paint("#e28d57"),
  yellow: paint("#deb95c"),
  lime: paint("#9fc769"),
  green: paint("#66b679"),
  teal: paint("#52b5a7"),
  sky: paint("#5da8d5"),
  blue: paint("#5f71be"),
  violet: paint("#a797e3"),
  purple: paint("#8d60c2"),
  pink: paint("#d5749e"),
  // "Bez koloru": a faint stripe keeps columns readable, no fill.
  white: { accent: "#9ca3af66", fill: "#9ca3af00" },
} satisfies Record<string, TimerColorPaint>;

/** The legacy appearance keeps the vivid colours it was designed with. */
const LEGACY_ACCENTS = {
  red: "#ef4444",
  orange: "#f97316",
  yellow: "#eab308",
  lime: "#84cc16",
  green: "#22c55e",
  teal: "#14b8a6",
  sky: "#0ea5e9",
  blue: "#3730a3",
  violet: "#a78bfa",
  purple: "#9333ea",
  pink: "#ec4899",
  white: "#9ca3af",
} satisfies Record<keyof typeof TIMERS_COLORS, string>;

export const isTimerColor = (
  color: string,
): color is keyof typeof TIMERS_COLORS => Object.hasOwn(TIMERS_COLORS, color);

export const getTimerColor = (
  color: string,
  legacyAppearance = false,
): TimerColorPaint | undefined => {
  if (!isTimerColor(color)) return undefined;

  if (!legacyAppearance) return TIMERS_COLORS[color];
  const accent = LEGACY_ACCENTS[color];

  return { accent, fill: `${accent}33`, hoverFill: `${accent}66` };
};

const legacyHoverFill = (color: string): string => {
  const hex = color.replace("#", "");

  const expanded =
    hex.length === 3 || hex.length === 4
      ? [...hex].map((digit) => digit + digit).join("")
      : hex;

  if (!/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(expanded)) return color;

  const rgb = [0, 2, 4]
    .map((offset) =>
      Math.min(
        255,
        Number.parseInt(expanded.slice(offset, offset + 2), 16) + 51,
      )
        .toString(16)
        .padStart(2, "0"),
    )
    .join("");

  return `#${rgb}${expanded.slice(6)}`;
};

type StoredTimerColor = {
  backgroundColor: string;
  borderColor: string;
};

/**
 * Resolves the paint for a timer from its selected colour id: a custom colour
 * or an overridden default wins, then the built-in palette, then "no colour".
 */
export const resolveTimerColorPaint = (
  selectedColor: string,
  customColor: StoredTimerColor | undefined,
  overriddenColor: StoredTimerColor | undefined,
  legacyAppearance = false,
): TimerColorPaint => {
  const storedColor = customColor ?? overriddenColor;

  if (storedColor) {
    const paint: TimerColorPaint = {
      accent: storedColor.borderColor,
      fill: storedColor.backgroundColor,
    };

    if (legacyAppearance) {
      paint.hoverFill = legacyHoverFill(storedColor.backgroundColor);
    }

    return paint;
  }

  return (
    getTimerColor(selectedColor, legacyAppearance) ??
    getTimerColor("white", legacyAppearance) ??
    TIMERS_COLORS.white
  );
};
