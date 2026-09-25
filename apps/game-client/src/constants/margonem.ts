import type { NpcTypeEnum } from "@lootlog/schema/npc-type";

export const MARGONEM_CDN_CHARACTERS_URL =
  "https://micc.garmory-cdn.cloud/obrazki/postacie";

export const MARGONEM_CDN_NPCS_URL =
  "https://micc.garmory-cdn.cloud/obrazki/npc/";

export const NPC_NAMES = {
  TITAN: { shortname: "T" },
  COLOSSUS: { shortname: "K" },
  HERO: { shortname: "H" },
  ELITE3: { shortname: "E3" },
  ELITE2: { shortname: "E2" },
  ELITE: { shortname: "E" },
};

export const getNpcTypeNames = (type: NpcTypeEnum) => {
  if (type === "COMMON" || type === "NPC" || type === "EVENT_HERO")
    return undefined;

  return NPC_NAMES[type];
};

export const MIN_RESP_BASE_SECONDS = 2;

export const MIN_NPC_WT = 20;
