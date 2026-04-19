import i18n from "@/i18n/config";

export const DEFAULT_COLOR_IDS = [
  "red",
  "orange",
  "yellow",
  "lime",
  "green",
  "teal",
  "sky",
  "blue",
  "violet",
  "purple",
  "pink",
  "white",
] as const;

export const getDefaultColorName = (colorId: string): string => {
  return i18n.t(`settings.timers.colors.defaultNames.${colorId}`, {
    defaultValue: colorId,
  });
};

export const getDefaultColorNames = (): Record<string, string> => {
  return Object.fromEntries(
    DEFAULT_COLOR_IDS.map((colorId) => [colorId, getDefaultColorName(colorId)]),
  );
};
