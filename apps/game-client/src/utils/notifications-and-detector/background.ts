import { NpcType } from "@/hooks/api/use-npcs";

const TEXT_COLORS_BY_KEY: Record<string, string> = {
  [NpcType.COLOSSUS]: "rgba(33, 131, 128, 1)",
  [NpcType.HERO]: "rgba(249, 137, 72, 1)",
  [NpcType.ELITE2]: "rgba(219, 90, 186, 1)",
  [NpcType.TITAN]: "rgba(59, 130, 246, 1)",
  message: "rgba(219, 39, 99, 1)",
};

const BACKGROUND_COLORS_BY_KEY: Record<string, string> = {
  [NpcType.COLOSSUS]: "rgba(33, 131, 128, 0.6)",
  [NpcType.HERO]: "rgba(249, 137, 72, 0.6)",
  [NpcType.ELITE2]: "rgba(219, 90, 186, 0.6)",
  [NpcType.TITAN]: "rgba(59, 130, 246, 0.6)",
  message: "rgba(219, 39, 99, 0.6)",
};

const BASE_BACKGROUND_GRADIENT_BY_NPC_TYPE: Record<string, string> = {
  [NpcType.COLOSSUS]: `linear-gradient(to top, ${BACKGROUND_COLORS_BY_KEY[NpcType.COLOSSUS]}, transparent)`,
  [NpcType.HERO]: `linear-gradient(to top, ${BACKGROUND_COLORS_BY_KEY[NpcType.HERO]}, transparent)`,
  [NpcType.ELITE2]: `linear-gradient(to top, ${BACKGROUND_COLORS_BY_KEY[NpcType.ELITE2]}, transparent)`,
  [NpcType.TITAN]: `linear-gradient(to top, ${BACKGROUND_COLORS_BY_KEY[NpcType.TITAN]}, transparent)`,
  message: `linear-gradient(to top, ${BACKGROUND_COLORS_BY_KEY["message"]}, transparent)`,
};

export const getGradient = (key?: string, highlight?: boolean) => {
  if (!highlight || !key || !(key in BASE_BACKGROUND_GRADIENT_BY_NPC_TYPE))
    return "transparent";
  return BASE_BACKGROUND_GRADIENT_BY_NPC_TYPE[key];
};

export const getBackgroundColor = (key?: string, highlight?: boolean) => {
  if (!highlight || !key || !(key in BACKGROUND_COLORS_BY_KEY))
    return "transparent";
  return BACKGROUND_COLORS_BY_KEY[key];
};

export const getTextColor = (key?: string, highlight?: boolean) => {
  if (!highlight || !key || !(key in TEXT_COLORS_BY_KEY)) return "white";
  return TEXT_COLORS_BY_KEY[key];
};
