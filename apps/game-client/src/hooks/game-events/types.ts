import type { Npcs } from "@lootlog/margonem/game-events";
import type { NpcDetectorSettingByNpc } from "@/store/npc-detector.store";

export type EventNpc = Npcs[0];

export interface ProcessedNpcSettings {
  settings: NpcDetectorSettingByNpc;
  icon: string;
  autoSendNotification: boolean;
  guildIds: string[];
}
