import type { Interface } from "@/types/margonem/interface";
import type { Npcs } from "./npcs";
import type { Communication } from "@/types/margonem/communication";
import type { Hero } from "@/types/margonem/hero";
import type { Map } from "@/types/margonem/map";
import type { NpcTplManager } from "@/types/margonem/npc-tpl-manager";
import type { NpcIconManager } from "@/types/margonem/npc-icon-manager";
import type { WorldConfig } from "@/types/margonem/world-config";
import type { ChangePlayer } from "@/types/margonem/change-player";
import type { Others } from "@/types/margonem/others";
import type { WidgetManager } from "./widget-manager";
import type { ServerStorage } from "./server-storage";
import type { ShowEqManager } from "./show-eq-manager";
import type { iframeWindowManager } from "./iframe-window-manager";
import type { ChatController } from "./chat-controller";

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
  showEqManager: ShowEqManager;
  iframeWindowManager: iframeWindowManager;
  chatController: ChatController;
  party?: {
    getMembers?: () => globalThis.Map<
      number,
      {
        id: number;
        nick: string;
        icon: string;
        leader: boolean;
        hp: [number, number];
        profession: string | null;
        accountId: number;
      }
    >;
  };
};
