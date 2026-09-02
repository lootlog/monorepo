import { Schema } from "effect";

export const NpcTypeEnum = {
  COMMON: "COMMON",
  ELITE: "ELITE",
  ELITE2: "ELITE2",
  ELITE3: "ELITE3",
  HERO: "HERO",
  EVENT_HERO: "EVENT_HERO",
  COLOSSUS: "COLOSSUS",
  TITAN: "TITAN",
  NPC: "NPC",
} as const;

export type NpcTypeEnum = (typeof NpcTypeEnum)[keyof typeof NpcTypeEnum];

export const NpcTypeSchema = Schema.Literals([
  NpcTypeEnum.COMMON,
  NpcTypeEnum.ELITE,
  NpcTypeEnum.ELITE2,
  NpcTypeEnum.ELITE3,
  NpcTypeEnum.HERO,
  NpcTypeEnum.EVENT_HERO,
  NpcTypeEnum.COLOSSUS,
  NpcTypeEnum.TITAN,
  NpcTypeEnum.NPC,
]);
