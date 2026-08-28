import type { ThemeConfigV1 } from "@lootlog/types";

type RgbColor = { red: number; green: number; blue: number };

const parseHexColor = (color: string): RgbColor => ({
  red: Number.parseInt(color.slice(1, 3), 16),
  green: Number.parseInt(color.slice(3, 5), 16),
  blue: Number.parseInt(color.slice(5, 7), 16),
});

const toHexChannel = (channel: number) =>
  Math.round(channel).toString(16).padStart(2, "0");

export const mixHexColors = (
  background: string,
  foreground: string,
  foregroundWeight: number,
) => {
  const base = parseHexColor(background);
  const overlay = parseHexColor(foreground);
  const weight = Math.min(1, Math.max(0, foregroundWeight));

  return `#${toHexChannel(base.red + (overlay.red - base.red) * weight)}${toHexChannel(base.green + (overlay.green - base.green) * weight)}${toHexChannel(base.blue + (overlay.blue - base.blue) * weight)}`;
};

const linearizeChannel = (channel: number) => {
  const normalized = channel / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
};

export const getContrastRatio = (first: string, second: string) => {
  const getLuminance = (color: string) => {
    const { red, green, blue } = parseHexColor(color);
    return (
      linearizeChannel(red) * 0.2126 +
      linearizeChannel(green) * 0.7152 +
      linearizeChannel(blue) * 0.0722
    );
  };
  const lighter = Math.max(getLuminance(first), getLuminance(second));
  const darker = Math.min(getLuminance(first), getLuminance(second));
  return (lighter + 0.05) / (darker + 0.05);
};

export const getReadableForeground = (background: string) => {
  const light = "#f7f8f2";
  const dark = "#07111f";
  return getContrastRatio(background, light) >=
    getContrastRatio(background, dark)
    ? light
    : dark;
};

export interface ThemeContrastIssue {
  token: keyof ThemeConfigV1["tokens"];
  surface: keyof ThemeConfigV1["tokens"];
  requiredRatio: number;
  actualRatio: number;
}

export const getThemeContrastIssues = (
  config: ThemeConfigV1,
): ThemeContrastIssue[] => {
  const pairs = [
    ["foreground", "background", 4.5],
    ["cardForeground", "card", 4.5],
    ["popoverForeground", "popover", 4.5],
    ["primaryForeground", "primary", 4.5],
    ["primaryForeground", "primaryHover", 4.5],
    ["primaryForeground", "primaryActive", 4.5],
    ["secondaryForeground", "secondary", 4.5],
    ["secondaryForeground", "secondaryHover", 4.5],
    ["secondaryForeground", "secondaryActive", 4.5],
    ["mutedForeground", "muted", 4.5],
    ["accentForeground", "accent", 4.5],
    ["destructiveForeground", "destructive", 4.5],
    ["destructiveForeground", "destructiveHover", 4.5],
    ["destructiveForeground", "destructiveActive", 4.5],
    ["foreground", "neutralHover", 4.5],
    ["foreground", "neutralActive", 4.5],
    ["foreground", "surfaceHover", 4.5],
    ["foreground", "surfaceSelected", 4.5],
    ["foreground", "inputHover", 4.5],
    ["sidebarForeground", "sidebar", 4.5],
    ["sidebarPrimaryForeground", "sidebarPrimary", 4.5],
    ["sidebarAccentForeground", "sidebarAccent", 4.5],
    ["sidebarAccentForeground", "sidebarHover", 4.5],
    ["sidebarPrimaryForeground", "sidebarActive", 4.5],
    ["ring", "background", 3],
    ["inputFocus", "background", 3],
    ["sidebarRing", "sidebar", 3],
  ] as const;

  return pairs.flatMap(([token, surface, requiredRatio]) => {
    const actualRatio = getContrastRatio(
      config.tokens[token],
      config.tokens[surface],
    );
    return actualRatio + Number.EPSILON < requiredRatio
      ? [{ token, surface, requiredRatio, actualRatio }]
      : [];
  });
};
