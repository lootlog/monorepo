import { GameEvent } from "@/types/margonem/game-events/game-event";
import { NpcType } from "@/hooks/api/use-npcs";

export interface ProcessedNpcSettings {
  settings: any;
  icon: string;
  autoSendMessage: boolean;
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
  npcs: any[];
  loots: any[];
  players: any[];
  accountId: string;
  characterId: string;
}

export interface EventHandlersConfig {
  isValidGameState: boolean;
  processNpcSettings: any;
  composeNpcFromEvent: any;
  composeNpcFromGame: any;
  processNpcActions: any;
  characterId?: string;
  world?: string;
  accountId?: string;
  createTimer?: any;
  removeNpc?: any;
  removeNotificationByNpcId?: any;
  setOpen?: any;
  addNpc?: any;
  pendingBattle?: React.RefObject<any>;
  talkingNpcId?: React.RefObject<string | null>;
  latestLootId?: React.RefObject<number | null>;
  createLootFromBattle?: (event: GameEvent) => void;
  handleUpdateLoot?: (event: GameEvent) => void;
  handleDialogLoot?: (event: GameEvent) => void;
  isLootDistributionMessage?: (msgData: any) => boolean;
}

export interface LootHandlersConfig {
  isValidGameState: boolean;
  world?: string;
  accountId?: string;
  characterId?: string;
  createLoot?: (data: LootCreationData, options?: any) => void;
  updateLoot?: (data: any, options?: any) => void;
  pendingBattle?: React.RefObject<any>;
  talkingNpcId?: React.RefObject<string | null>;
  latestLootId?: React.RefObject<number | null>;
  isLootDistributionMessage?: (msgData: any) => boolean;
}

export interface NpcProcessorsConfig {
  settingsRef: React.RefObject<any>;
  handleSendMessage: (npcType: NpcType, baseMessage: string, npcLocation: NpcLocation, guildIds: string[]) => void;
  handleSendNotification: (npc: any, guildIds: string[]) => void;
  characterId?: string;
}

export interface MessagingHandlersConfig {
  sendChatMessage?: any;
  createNotification?: any;
  setOpen?: any;
  world?: string;
  characterId?: string;
  accountId?: string;
}
