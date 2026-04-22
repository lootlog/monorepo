import type {
  MessageType as ChatMessageType,
  PartyGatheringChatData,
  SendChatMessageOptions,
} from "@/api/chat.api";
import type { CreateNotificationOptions } from "@/api/messaging.api";
import { buildChatCharacterData } from "@/lib/api/generated-helpers";
import { resolveDetectorGuildIds } from "@/lib/game-account-preferences";
import { Game } from "@/lib/game";
import type { GameNpcWithLocation } from "@/store/npc-detector.store";
import type { DetectorRoutingRule } from "@lootlog/types";

type ResolveNpcNotificationRoutingOptions = {
  routingRules: DetectorRoutingRule[];
  npcLevel: number;
};

type BuildNpcNotificationPayloadOptions = {
  npc: GameNpcWithLocation;
  guildIds: string[];
  world?: string;
  isGatheringParty?: boolean;
};

type BuildNpcChatMessagePayloadOptions = {
  npc: GameNpcWithLocation;
  guildIds: string[];
  messageType: ChatMessageType;
  message?: string;
  partyGathering?: PartyGatheringChatData;
};

const buildNotificationNpcPayload = (npc: GameNpcWithLocation) => ({
  id: npc.id,
  hpp: 0,
  location: npc.location,
  name: npc.nick,
  wt: npc.wt,
  x: npc.x,
  y: npc.y,
  lvl: npc.lvl,
  prof: npc.prof,
  icon: npc.icon,
  type: npc.type,
});

const buildChatNpcPayload = (npc: GameNpcWithLocation) => ({
  x: npc.x,
  y: npc.y,
  icon: npc.icon,
  id: npc.id,
  name: npc.nick,
  lvl: npc.lvl,
  prof: npc.prof,
  type: npc.type,
  hpp: 0,
  location: npc.location,
  wt: npc.wt,
});

export const resolveNpcNotificationRouting = ({
  routingRules,
  npcLevel,
}: ResolveNpcNotificationRoutingOptions) => {
  const world = Game.getWorldName();
  const guildIds = resolveDetectorGuildIds(routingRules, npcLevel, world);

  return {
    guildIds,
    world,
  };
};

export const buildNpcNotificationPayload = ({
  npc,
  guildIds,
  world = Game.getWorldName(),
  isGatheringParty = false,
}: BuildNpcNotificationPayloadOptions): CreateNotificationOptions => ({
  npc: buildNotificationNpcPayload(npc),
  world,
  guildIds,
  ...(isGatheringParty ? { isGatheringParty } : {}),
});

export const buildNpcChatMessagePayload = ({
  npc,
  guildIds,
  messageType,
  message = "",
  partyGathering,
}: BuildNpcChatMessagePayloadOptions): SendChatMessageOptions => ({
  message,
  guildIds,
  type: messageType,
  characterData: buildChatCharacterData(),
  npc: buildChatNpcPayload(npc),
  ...(partyGathering ? { partyGathering } : {}),
});
