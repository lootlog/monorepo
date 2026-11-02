import type { NpcTypeEnum } from "@lootlog/schema/npc-type";

export const MARGONEM_CDN_CHARACTERS_URL =
  "https://micc.garmory-cdn.cloud/obrazki/postacie";

export const NPC_NAMES = {
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

/**
 * Hero Trackers return about 90 minutes after their entrance closes on public
 * worlds. The API keeps a faster base observed on a private world instead.
 */
export const HERO_TRACKER_RESP_BASE_SECONDS = 90 * 60;
