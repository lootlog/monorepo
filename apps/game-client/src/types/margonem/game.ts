import { OldNpcMap } from "./npcs";
import { OldOtherMap, OtherMap } from "./others";
import { WorldConfig } from "./world-config";

export type Game = {
  init: Number;
  worldConfig: WorldConfig;
  npc: OldNpcMap;
  other: OldOtherMap;
};
