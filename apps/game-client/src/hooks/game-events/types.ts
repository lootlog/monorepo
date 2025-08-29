import { GameEvent } from "@/types/margonem/game-events/game-event";
import { NpcType } from "@/hooks/api/use-npcs";
import { GameNpc } from "@/types/margonem/npcs";
import { NpcTpl } from "@/types/margonem/npc-tpl-manager";
import { Npcs } from "@/types/margonem/game-events/npcs";
import {
  NpcDetectorSettingByNpc,
  NpcDetectorSettings,
  GameNpcWithLocation,
} from "@/store/npc-detector.store";
import { LootDto, CreateLootResponse } from "@/hooks/api/use-create-loot";
import { UpdateLootOptions } from "@/hooks/api/use-update-loot";
import { UseCreateTimerOptions } from "@/hooks/api/use-create-timer";
import { UseSendChatMessageOptions } from "@/hooks/api/use-send-chat-message";
import { UseCreateNotificationOptions } from "@/hooks/api/use-create-notification";
import { PartyMember, Npc } from "@/utils/game/get-battle-participants";
import { ChatEventMsg } from "@/types/margonem/game-events/chat";
import { W } from "@/types/margonem/game-events/f";
import { WindowId } from "@/store/windows.store";
import { AxiosResponse } from "axios";

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
    event?: GameEvent
  ) => ProcessedNpcSettings | null;
  processGameNpcSettings: (
    npc: GameNpc,
    npcType: NpcType
  ) => ProcessedNpcSettings | null;
  composeNpcFromEvent: (
    npc: EventNpc,
    tpl: NpcTpl,
    processedSettings: ProcessedNpcSettings
  ) => GameNpcWithLocation;
  composeNpcFromGame: (
    npc: GameNpc,
    processedSettings: ProcessedNpcSettings
  ) => GameNpcWithLocation;
  processNpcActions: (
    composedNpc: GameNpcWithLocation,
    npcType: NpcType,
    guildIds: string[],
    autoSendMessage: boolean,
    autoSendNotification: boolean
  ) => void;
  characterId?: string;
  world?: string;
  accountId?: string;
  createTimer?: (data: UseCreateTimerOptions) => void;
  removeNpc?: (npcId: number | number[]) => void;
  removeNotificationByNpcId?: (npcId: number, world?: string) => void;
  setOpen?: <T = unknown>(window: WindowId, open: boolean, state?: T) => void;
  addNpc?: (npc: GameNpcWithLocation | GameNpcWithLocation[]) => void;
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
  world?: string;
  accountId?: string;
  characterId?: string;
  createLoot?: (
    data: LootCreationData,
    options?: {
      onSuccess?: (response: AxiosResponse<CreateLootResponse>) => void;
      onError?: (error: any) => void;
    }
  ) => void;
  updateLoot?: (
    data: UpdateLootOptions,
    options?: {
      onSuccess?: () => void;
      onError?: (error: any) => void;
    }
  ) => void;
  pendingBattle?: React.RefObject<W | null>;
  talkingNpcId?: React.RefObject<string | null>;
  latestLootId?: React.RefObject<number | null>;
  isLootDistributionMessage?: (msgData: ChatEventMsg) => boolean;
}

export interface NpcProcessorsConfig {
  settingsRef: React.RefObject<Record<string, NpcDetectorSettings>>;
  handleSendMessage: (
    npcType: NpcType,
    baseMessage: string,
    npcLocation: NpcLocation,
    guildIds: string[]
  ) => void;
  handleSendNotification: (npc: GameNpc, guildIds: string[]) => void;
  characterId?: string;
}

export interface MessagingHandlersConfig {
  sendChatMessage?: (data: UseSendChatMessageOptions) => void;
  createNotification?: (data: UseCreateNotificationOptions) => void;
  setOpen?: <T = unknown>(window: WindowId, open: boolean, state?: T) => void;
  world?: string;
  characterId?: string;
  accountId?: string;
}
