import { NpcType } from "@/api/npcs.api";
import {
  DEFAULT_NPC_TYPE_COLORS,
  isAppearanceNpcType,
  type NpcTypeColors,
} from "@lootlog/schema/npc-appearance";
import { deriveNpcSurfaceColors } from "@lootlog/domain/npc-appearance";

/** Notification kinds without an NPC type, as red, green and blue. */
const MESSAGE_COLORS_BY_KEY = {
  message: "219, 39, 99",
  "party-gathering": "147, 51, 234",
};

const isMessageColorKey = (
  key: string,
): key is keyof typeof MESSAGE_COLORS_BY_KEY =>
  Object.hasOwn(MESSAGE_COLORS_BY_KEY, key);

const PLAIN_COLORS = {
  background: "transparent",
  text: "white",
  border: "rgba(156, 163, 175, 1)",
};

/**
 * How a notification or detector row is painted: in the colour of its NPC type
 * or message kind when highlighted, plain otherwise.
 */
export const getNotificationColors = (
  key: string | undefined,
  highlight: boolean | undefined,
  npcTypeColors: NpcTypeColors = DEFAULT_NPC_TYPE_COLORS,
) => {
  if (!highlight || !key) return PLAIN_COLORS;

  if (isAppearanceNpcType(key)) {
    return deriveNpcSurfaceColors(npcTypeColors[key]);
  }

  if (!isMessageColorKey(key)) return PLAIN_COLORS;

  const rgb = MESSAGE_COLORS_BY_KEY[key];

  return {
    background: `rgba(${rgb}, 0.4)`,
    text: `rgba(${rgb}, 1)`,
    border: `rgba(${rgb}, 1)`,
  };
};

export const getSubtleBackgroundColor = (
  key: string | undefined,
  npcTypeColors?: NpcTypeColors,
) =>
  `color-mix(in srgb, ${getNotificationColors(key, true, npcTypeColors).background} 37.5%, transparent)`;

/** How brightly a row plays its arrival: rarer NPCs flash harder. */
export const getArrivalStrength = (key?: string) => {
  switch (key) {
    case NpcType.TITAN:
    case NpcType.COLOSSUS:
      return 1;
    case NpcType.HERO:
    case NpcType.EVENT_HERO:
    case NpcType.HERO_TRACKER:
      return 0.85;
    case NpcType.ELITE2:
      return 0.65;
    default:
      return 0.8;
  }
};
