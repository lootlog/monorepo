import type { GameEvent } from "@/types/margonem/game-events/game-event";
import type { Npcs } from "@/types/margonem/game-events/npcs";
import type { NpcDetectorSettingByNpc } from "@/store/npc-detector.store";
import type { LootDto } from "@/hooks/api/use-create-loot";
import type { PartyMember, Npc } from "@/utils/game/get-battle-participants";

export type EventNpc = Npcs[0];

export interface ProcessedNpcSettings {
  settings: NpcDetectorSettingByNpc;
  icon: string;
  autoSendNotification: boolean;
  guildIds: string[];
}

export interface NpcLocation {
  name: string;
  x: number;
  y: number;
}

export interface GameEventHandlers {
  handleChatEvents: (event: GameEvent) => void;
  handleDialogEvents: (event: GameEvent) => void;
  handleBattleEvents: (event: GameEvent) => void;
  handleNpcDetection: (event: GameEvent) => void;
  handleDialogLoot: (event: GameEvent) => void;
  handleRespawnTimers: (event: GameEvent) => void;
}

export interface LootCreationData {
  world: string;
  source: string;
  location: string;
  npcs: Npc[];
  loots: LootDto[];
  players: PartyMember[];
  accountId: string;
  characterId: string;
}
