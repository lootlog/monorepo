import type { NpcTypeEnum } from "@lootlog/schema/npc-type";

const NPC_NAMES = {
  TITAN: { shortname: "T" },
  COLOSSUS: { shortname: "K" },
  HERO: { shortname: "H" },
  EVENT_HERO: { shortname: "HE" },
  HERO_TRACKER: { shortname: "TH" },
  ELITE3: { shortname: "E3" },
  ELITE2: { shortname: "E2" },
  ELITE: { shortname: "E" },
};

export const getNpcTypeNames = (type: NpcTypeEnum) => {
  if (type === "COMMON" || type === "NPC") return undefined;

  return NPC_NAMES[type];
};
