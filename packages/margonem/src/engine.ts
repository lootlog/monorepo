import type { Interface } from "./interface.js";
import type { Npcs } from "./npcs.js";
import type { Communication } from "./communication.js";
import type { Hero } from "./hero.js";
import type { Map } from "./map.js";
import type { NpcTplManager } from "./npc-tpl-manager.js";
import type { NpcIconManager } from "./npc-icon-manager.js";
import type { WorldConfig } from "./world-config.js";
import type { ChangePlayer } from "./change-player.js";
import type { Others } from "./others.js";
import type { WidgetManager } from "./widget-manager.js";
import type { ServerStorage } from "./server-storage.js";
import type { ShowEqManager } from "./show-eq-manager.js";
import type { iframeWindowManager } from "./iframe-window-manager.js";
import type { ChatController } from "./chat-controller.js";
import type { ApiData } from "./api.js";

export type Engine = {
  apiData?: ApiData;
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
