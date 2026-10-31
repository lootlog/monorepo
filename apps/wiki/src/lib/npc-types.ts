import type { NpcTypeIconType } from "@lootlog/ui/components/npc-type-icon";

/** Kinds of NPC the catalog lists, strongest first. */
export const NPC_TYPE_OPTIONS = [
  "TITAN",
  "COLOSSUS",
  "HERO",
  "EVENT_HERO",
  "ELITE3",
  "ELITE2",
  "ELITE",
  "COMMON",
  "NPC",
] as const;

export type NpcTypeOption = (typeof NPC_TYPE_OPTIONS)[number];

/** The game's pixel sprite for each kind of NPC. */
export const NPC_TYPE_ICONS = {
  TITAN: "TITAN",
  COLOSSUS: "COLOSSUS",
  HERO: "HERO",
  EVENT_HERO: "HERO",
  ELITE3: "ELITE2",
  ELITE2: "ELITE2",
  ELITE: "ELITE2",
  COMMON: "OTHER",
  NPC: "OTHER",
} as const satisfies Record<NpcTypeOption, NpcTypeIconType>;
