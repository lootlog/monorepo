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

export const getTimerColor = (
  color: string,
  legacyAppearance = false,
): TimerColorPaint | undefined => {
  if (!isTimerColor(color)) return undefined;
  const current = TIMERS_COLORS[color];

  if (!legacyAppearance) return current;
  const accent = current.accent.slice(0, 7);

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

/** "Bez koloru" leaves the row background to the list, not to the colour. */
export const isUnpaintedTimerColor = (paint: TimerColorPaint): boolean =>
  paint.fill === TIMERS_COLORS.white.fill;

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
