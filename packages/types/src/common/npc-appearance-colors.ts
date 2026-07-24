export const COMBAT_NPC_TYPES = [
  "ELITE",
  "ELITE2",
  "ELITE3",
  "HERO",
  "EVENT_HERO",
  "COLOSSUS",
  "TITAN",
] as const;

export type CombatNpcType = (typeof COMBAT_NPC_TYPES)[number];
export type NpcTypeColors = Record<CombatNpcType, string>;

export const DEFAULT_NPC_TYPE_COLORS: NpcTypeColors = {
  ELITE: "#84CC16",
  ELITE2: "#DB5ABA",
  ELITE3: "#A855F7",
  HERO: "#F98948",
  EVENT_HERO: "#EAB308",
  COLOSSUS: "#218380",
  TITAN: "#194894",
};

const HEX_COLOR_PATTERN = /^#[\dA-F]{6}$/i;
const DARK_SURFACE_RGB = [3, 7, 18] as const;
const MINIMUM_TEXT_CONTRAST = 3;

export const isHexAppearanceColor = (value: unknown): value is string =>
  typeof value === "string" && HEX_COLOR_PATTERN.test(value);

export const isCombatNpcType = (value: string): value is CombatNpcType =>
  COMBAT_NPC_TYPES.includes(value as CombatNpcType);

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

const relativeLuminance = (rgb: readonly number[]) => {
  const [red, green, blue] = rgb.map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
};

const contrastRatio = (left: readonly number[], right: readonly number[]) => {
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
    const mixed = accentRgb.map(
      (channel) => channel + (255 - channel) * whiteMix,
    );
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
