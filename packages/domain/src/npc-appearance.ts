import { Predicate } from "effect";
import { contrastRatio, hexToRgb, rgbToHex, type RgbColor } from "./color.js";
import {
  COMBAT_NPC_TYPES,
  DEFAULT_NPC_TYPE_COLORS,
  isHexAppearanceColor,
  type NpcTypeColors,
} from "@lootlog/schema/npc-appearance";

const DARK_SURFACE_RGB: RgbColor = [3, 7, 18];

const MINIMUM_TEXT_CONTRAST = 3;

export const normalizeAppearanceColor = (
  value: unknown,
  fallback: string,
): string =>
  isHexAppearanceColor(value) ? value.toUpperCase() : fallback.toUpperCase();

export const normalizeNpcTypeColors = (value: unknown): NpcTypeColors => {
  const candidate = Predicate.isObject(value) ? value : undefined;

  const colors: NpcTypeColors = { ...DEFAULT_NPC_TYPE_COLORS };

  for (const npcType of COMBAT_NPC_TYPES) {
    colors[npcType] = normalizeAppearanceColor(
      candidate?.[npcType],
      colors[npcType],
    );
  }

  return colors;
};

const getReadableTextColor = (accent: string) => {
  const accentRgb = hexToRgb(normalizeAppearanceColor(accent, "#FFFFFF"));

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
      return rgbToHex(mixed);
    }
  }

  return "#FFFFFF";
};

export const deriveNpcSurfaceColors = (accentValue: string) => {
  const accent = normalizeAppearanceColor(accentValue, "#FFFFFF");
  const [red, green, blue] = hexToRgb(accent);

  return {
    border: accent,
    background: `rgba(${red}, ${green}, ${blue}, 0.4)`,
    text: getReadableTextColor(accent),
  };
};
