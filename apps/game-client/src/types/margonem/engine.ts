import { Interface } from "@/types/margonem/interface";
import { Npcs } from "./npcs";
import { Communication } from "@/types/margonem/communication";
import { Hero } from "@/types/margonem/hero";
import { Map } from "@/types/margonem/map";
import { NpcTplManager } from "@/types/margonem/npc-tpl-manager";
import { NpcIconManager } from "@/types/margonem/npc-icon-manager";
import { WorldConfig } from "@/types/margonem/world-config";
import { ChangePlayer } from "@/types/margonem/change-player";
import { Others } from "@/types/margonem/others";
import { WidgetManager } from "./widget-manager";
import { ServerStorage } from "./server-storage";

export type Engine = {
  npcs: Npcs;
  interface: Interface;
  communication: Communication;
  hero: Hero;
  map: Map;
  npcTplManager: NpcTplManager;
  npcIconManager: NpcIconManager;
  worldConfig: WorldConfig;
  changePlayer: ChangePlayer;
  others: Others;
  widgetManager: WidgetManager;
  serverStorage: ServerStorage;
};
