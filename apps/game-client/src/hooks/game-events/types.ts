import { GameEvent } from "@/types/margonem/game-events/game-event";
import { GameNpc } from "@/types/margonem/npcs";
import { NpcTpl } from "@/types/margonem/npc-tpl-manager";
import { Npcs } from "@/types/margonem/game-events/npcs";
import {
  NpcDetectorSettingByNpc,
  NpcDetectorSettings,
  GameNpcWithLocation,
} from "@/store/npc-detector.store";
import { LootDto } from "@/hooks/api/use-create-loot";
import { PartyMember, Npc } from "@/utils/game/get-battle-participants";
import { ChatEventMsg } from "@/types/margonem/game-events/chat";
import { W } from "@/types/margonem/game-events/f";
import { NpcType } from "@/hooks/api/use-npcs";

export type EventNpc = Npcs[0];

export interface ProcessedNpcSettings {
  settings: NpcDetectorSettingByNpc;
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
  npcs: Npc[];
  loots: LootDto[];
  players: PartyMember[];
  accountId: string;
  characterId: string;
}

export interface EventHandlersConfig {
  isValidGameState: boolean;
  processNpcSettings: (
    npc: EventNpc,
    npcType: NpcType,
    event?: GameEvent,
  ) => ProcessedNpcSettings | null;
  processGameNpcSettings: (
    npc: GameNpc,
    npcType: NpcType,
  ) => ProcessedNpcSettings | null;
  composeNpcFromEvent: (
    npc: EventNpc,
    tpl: NpcTpl,
    processedSettings: ProcessedNpcSettings,
  ) => GameNpcWithLocation;
  composeNpcFromGame: (
    npc: GameNpc,
    processedSettings: ProcessedNpcSettings,
  ) => GameNpcWithLocation;
  processNpcActions: (
    composedNpc: GameNpcWithLocation,
    npcType: NpcType,
    guildIds: string[],
    autoSendMessage: boolean,
    autoSendNotification: boolean,
  ) => void;
  removeNpc?: (npcId: number | number[]) => void;
  removeNotificationByNpcId?: (npcId: number, world?: string) => void;
  pendingBattle?: React.RefObject<W | null>;
  talkingNpcId?: React.RefObject<string | null>;
  latestLootId?: React.RefObject<number | null>;
  createLootFromBattle?: (event: GameEvent) => void;
  handleUpdateLoot?: (event: GameEvent) => void;
  handleDialogLoot?: (event: GameEvent) => void;
  isLootDistributionMessage?: (msgData: ChatEventMsg) => boolean;
}

export interface LootHandlersConfig {
  isValidGameState: boolean;
  pendingBattle?: React.RefObject<W | null>;
  talkingNpcId?: React.RefObject<string | null>;
  latestLootId?: React.RefObject<number | null>;
  isLootDistributionMessage?: (msgData: ChatEventMsg) => boolean;
}
