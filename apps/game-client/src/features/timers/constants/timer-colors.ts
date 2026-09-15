/**
 * How a timer tile is painted: `accent` is the opaque stripe on its left edge
 * and the swatch colour in pickers, `fill` is the translucent row background.
 * Custom and overridden colours use the same pair under the names
 * `borderColor` and `backgroundColor`.
 */
export type TimerColorPaint = {
  accent: string;
  fill: string;
};

const TILE_FILL_ALPHA_HEX = "59";

const paint = (hex: string): TimerColorPaint => ({
  accent: hex,
  fill: `${hex}${TILE_FILL_ALPHA_HEX}`,
});

export const TIMERS_COLORS = {
  red: paint("#ef4444"),
  orange: paint("#f97316"),
  yellow: paint("#eab308"),
  lime: paint("#84cc16"),
  green: paint("#22c55e"),
  teal: paint("#14b8a6"),
  sky: paint("#0ea5e9"),
  blue: paint("#3730a3"),
  violet: paint("#a78bfa"),
  purple: paint("#9333ea"),
  pink: paint("#ec4899"),
  // "Bez koloru": a faint stripe keeps columns readable, no fill.
  white: { accent: "#9ca3af66", fill: "#9ca3af00" },
} satisfies Record<string, TimerColorPaint>;

export const isTimerColor = (
  color: string,
): color is keyof typeof TIMERS_COLORS => Object.hasOwn(TIMERS_COLORS, color);

export const getTimerColor = (color: string): TimerColorPaint | undefined =>
  isTimerColor(color) ? TIMERS_COLORS[color] : undefined;

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
): TimerColorPaint => {
  const storedColor = customColor ?? overriddenColor;

  if (storedColor) {
    return {
      accent: storedColor.borderColor,
      fill: storedColor.backgroundColor,
    };
  }

  return getTimerColor(selectedColor) ?? TIMERS_COLORS.white;
};
