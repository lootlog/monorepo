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
