import {
  COMBAT_NPC_TYPES,
  DEFAULT_NPC_TYPE_COLORS,
  isHexAppearanceColor,
  type NpcTypeColors,
} from "@lootlog/schema/npc-appearance";

const DARK_SURFACE_RGB = [3, 7, 18] as const;
const MINIMUM_TEXT_CONTRAST = 3;

export const normalizeAppearanceColor = (
  value: unknown,
  fallback: string,
): string =>
  isHexAppearanceColor(value) ? value.toUpperCase() : fallback.toUpperCase();

export const normalizeNpcTypeColors = (value: unknown): NpcTypeColors => {
  const candidate =
    typeof value === "object" && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  return Object.fromEntries(
    COMBAT_NPC_TYPES.map((npcType) => [
      npcType,
      normalizeAppearanceColor(
        candidate[npcType],
        DEFAULT_NPC_TYPE_COLORS[npcType],
      ),
    ]),
  ) as unknown as NpcTypeColors;
};

const hexToRgb = (color: string) => {
  const normalized = normalizeAppearanceColor(color, "#FFFFFF").slice(1);
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ] as const;
};

const toHex = (rgb: readonly number[]) =>
  `#${rgb
    .map((channel) => Math.round(channel).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;

type RgbColor = readonly [number, number, number];

const toLinearColorChannel = (channel: number) => {
  const normalized = channel / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
};

const relativeLuminance = (rgb: RgbColor) => {
  const red = toLinearColorChannel(rgb[0]);
  const green = toLinearColorChannel(rgb[1]);
  const blue = toLinearColorChannel(rgb[2]);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
};

const contrastRatio = (left: RgbColor, right: RgbColor) => {
  const lighter = Math.max(relativeLuminance(left), relativeLuminance(right));
  const darker = Math.min(relativeLuminance(left), relativeLuminance(right));
  return (lighter + 0.05) / (darker + 0.05);
};

const getReadableTextColor = (accent: string) => {
  const accentRgb = hexToRgb(accent);
  if (contrastRatio(accentRgb, DARK_SURFACE_RGB) >= MINIMUM_TEXT_CONTRAST) {
    return normalizeAppearanceColor(accent, "#FFFFFF");
  }

  for (let whiteMix = 0.05; whiteMix <= 1; whiteMix += 0.05) {
    const mixed = [
      accentRgb[0] + (255 - accentRgb[0]) * whiteMix,
      accentRgb[1] + (255 - accentRgb[1]) * whiteMix,
      accentRgb[2] + (255 - accentRgb[2]) * whiteMix,
    ] as const;
    if (contrastRatio(mixed, DARK_SURFACE_RGB) >= MINIMUM_TEXT_CONTRAST) {
      return toHex(mixed);
    }
  }

  return "#FFFFFF";
};

export const deriveNpcSurfaceColors = (accentValue: unknown) => {
  const accent = normalizeAppearanceColor(accentValue, "#FFFFFF");
  const [red, green, blue] = hexToRgb(accent);

  return {
    border: accent,
    background: `rgba(${red}, ${green}, ${blue}, 0.4)`,
    text: getReadableTextColor(accent),
  };
};
