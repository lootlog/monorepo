import { NpcType } from "@/api/npcs.api";
import {
  DEFAULT_NPC_TYPE_COLORS,
  isCombatNpcType,
  type NpcTypeColors,
} from "@lootlog/schema/npc-appearance";
import { deriveNpcSurfaceColors } from "@lootlog/domain/npc-appearance";

const TEXT_COLORS_BY_KEY: Record<string, string> = {
  [NpcType.COLOSSUS]: "rgba(33, 131, 128, 1)",
  [NpcType.HERO]: "rgba(249, 137, 72, 1)",
  [NpcType.ELITE2]: "rgba(219, 90, 186, 1)",
  [NpcType.TITAN]: "rgba(25, 72, 148, 1)",
  message: "rgba(219, 39, 99, 1)",
  "party-gathering": "rgba(147, 51, 234, 1)",
};

const BACKGROUND_COLORS_BY_KEY: Record<string, string> = {
  [NpcType.COLOSSUS]: "rgba(33, 131, 128, 0.4)",
  [NpcType.HERO]: "rgba(249, 137, 72, 0.4)",
  [NpcType.ELITE2]: "rgba(219, 90, 186, 0.4)",
  [NpcType.TITAN]: "rgba(25, 72, 148, 0.4)",
  message: "rgba(219, 39, 99, 0.4)",
  "party-gathering": "rgba(147, 51, 234, 0.4)",
};

const getNpcSurfaceColors = (
  key: string | undefined,
  npcTypeColors: NpcTypeColors,
) =>
  key && isCombatNpcType(key)
    ? deriveNpcSurfaceColors(npcTypeColors[key])
    : undefined;

export const getBackgroundColor = (
  key?: string,
  highlight?: boolean,
  npcTypeColors: NpcTypeColors = DEFAULT_NPC_TYPE_COLORS,
) => {
  const npcColors = getNpcSurfaceColors(key, npcTypeColors);
  if (highlight && npcColors) return npcColors.background;
  if (!highlight || !key || !(key in BACKGROUND_COLORS_BY_KEY))
    return "transparent";
  return BACKGROUND_COLORS_BY_KEY[key];
};

export const getTextColor = (
  key?: string,
  highlight?: boolean,
  npcTypeColors: NpcTypeColors = DEFAULT_NPC_TYPE_COLORS,
) => {
  const npcColors = getNpcSurfaceColors(key, npcTypeColors);
  if (highlight && npcColors) return npcColors.text;
  if (!highlight || !key || !(key in TEXT_COLORS_BY_KEY)) return "white";
  return TEXT_COLORS_BY_KEY[key];
};

export const getBorderColor = (
  key?: string,
  highlight?: boolean,
  npcTypeColors: NpcTypeColors = DEFAULT_NPC_TYPE_COLORS,
) => {
  const npcColors = getNpcSurfaceColors(key, npcTypeColors);
  if (highlight && npcColors) return npcColors.border;
  if (!highlight || !key || !(key in TEXT_COLORS_BY_KEY))
    return "rgba(156, 163, 175, 1)";
  return TEXT_COLORS_BY_KEY[key];
};
