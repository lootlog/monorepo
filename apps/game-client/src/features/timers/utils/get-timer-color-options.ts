import {
  TIMERS_COLORS,
  getTimerColor,
} from "@/features/timers/constants/timer-colors";
import { getDefaultColorName } from "@/features/timers/utils/get-default-color-name";

export type TimerColorOption = {
  id: string;
  name: string;
  /** The colour a swatch shows: the tile accent, or a custom colour's border. */
  swatchColor: string;
};

type TimerColorOptionsInput = {
  customColors: Record<
    string,
    { id: string; name: string; borderColor: string }
  >;
  defaultColorNames: Record<string, string>;
  overriddenDefaultColors: Record<string, { borderColor: string }>;
  hiddenDefaultColors: readonly string[];
  legacyAppearance: boolean;
};

/**
 * Every colour a player can pick or filter by, in palette order: the visible
 * default colours with their renames and overrides, then the custom colours.
 */
export const getTimerColorOptions = ({
  customColors,
  defaultColorNames,
  overriddenDefaultColors,
  hiddenDefaultColors,
  legacyAppearance,
}: TimerColorOptionsInput): TimerColorOption[] => {
  const hiddenColorIds = new Set(hiddenDefaultColors);

  return [
    ...Object.entries(TIMERS_COLORS).flatMap(([id, paint]) =>
      hiddenColorIds.has(id)
        ? []
        : [
            {
              id,
              name:
                defaultColorNames[id] ??
                getDefaultColorName(id, legacyAppearance),
              swatchColor:
                overriddenDefaultColors[id]?.borderColor ??
                getTimerColor(id, legacyAppearance)?.accent ??
                paint.accent,
            },
          ],
    ),
    ...Object.values(customColors).map((color) => ({
      id: color.id,
      name: color.name,
      swatchColor: color.borderColor,
    })),
  ];
};
