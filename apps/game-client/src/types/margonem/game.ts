import { NpcTplManager } from "@/types/margonem/npc-tpl-manager";
import { OldNpcMap } from "./npcs";
import { OldOtherMap, OtherMap } from "./others";
import { WorldConfig } from "./world-config";
import { NpcIconManager } from "@/types/margonem/npc-icon-manager";

export type Game = {
  init: Number;
  worldConfig: WorldConfig;
  npc: OldNpcMap;
  other: OldOtherMap;
  npcTplManager: NpcTplManager;
  npcIconManager: NpcIconManager;
};
