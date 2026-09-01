import { Schema } from "effect";

export enum NpcTypeEnum {
  COMMON = "COMMON",
  ELITE = "ELITE",
  ELITE2 = "ELITE2",
  ELITE3 = "ELITE3",
  HERO = "HERO",
  EVENT_HERO = "EVENT_HERO",
  COLOSSUS = "COLOSSUS",
  TITAN = "TITAN",
  NPC = "NPC",
}

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
