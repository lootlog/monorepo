import type {
  MessageType as ChatMessageType,
  PartyGatheringChatData,
  SendChatMessageOptions,
} from "@/api/chat.api";
import type { CreateNotificationOptions } from "@/api/messaging.api";
import {
  buildChatCharacterData,
  buildCurrentCharacterPayload,
} from "@/lib/api/generated-helpers";
import { resolveDetectorGuildIds } from "@/lib/game-account-preferences";
import type { GameNpcWithLocation } from "@/store/npc-detector.store";
import { useGameStore } from "@/store/game.store";
import type { DetectorRoutingRule } from "@lootlog/schema/account-preferences";

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
  const world = useGameStore.getState().game?.world ?? "unknown";
  const guildIds = resolveDetectorGuildIds(routingRules, npcLevel, world);

  return {
    guildIds,
    world,
  };
};

export function buildNpcNotificationPayload(
  options: BuildNpcNotificationPayloadOptions & { isGatheringParty: true },
): CreateNotificationOptions | null;
export function buildNpcNotificationPayload(
  options: BuildNpcNotificationPayloadOptions,
): CreateNotificationOptions;
export function buildNpcNotificationPayload({
  npc,
  guildIds,
  world = useGameStore.getState().game?.world ?? "unknown",
  isGatheringParty = false,
}: BuildNpcNotificationPayloadOptions): CreateNotificationOptions | null {
  const character = isGatheringParty
    ? buildCurrentCharacterPayload()
    : undefined;
  if (isGatheringParty && !character) return null;

  return {
    npc: buildNotificationNpcPayload(npc),
    world,
    guildIds,
    ...(isGatheringParty ? { isGatheringParty, character } : {}),
  };
}

export const buildNpcChatMessagePayload = ({
  npc,
  guildIds,
  messageType,
  message = "",
  partyGathering,
}: BuildNpcChatMessagePayloadOptions): SendChatMessageOptions | null => {
  const characterData = buildChatCharacterData();
  if (!characterData) return null;

  return {
    message,
    guildIds,
    type: messageType,
    characterData,
    npc: buildChatNpcPayload(npc),
    ...(partyGathering ? { partyGathering } : {}),
  };
};
