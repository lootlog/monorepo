import type { NpcTplManager } from "./npc-tpl-manager.js";
import type { OldNpcMap } from "./npcs.js";
import type { OldOtherMap } from "./others.js";
import type { WorldConfig } from "./world-config.js";
import type { NpcIconManager } from "./npc-icon-manager.js";

export type Game = {
  init: number;
  worldConfig: WorldConfig;
  npc: OldNpcMap;
  other: OldOtherMap;
  npcTplManager: NpcTplManager;
  npcIconManager: NpcIconManager;
};
