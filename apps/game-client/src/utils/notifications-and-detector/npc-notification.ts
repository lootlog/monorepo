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

  const payload: CreateNotificationOptions = {
    npc: buildNotificationNpcPayload(npc),
    world,
    guildIds,
  };
  if (isGatheringParty) {
    payload.isGatheringParty = isGatheringParty;
    payload.character = character;
  }
  return payload;
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

  const payload: SendChatMessageOptions = {
    message,
    guildIds,
    type: messageType,
    characterData,
    npc: buildNotificationNpcPayload(npc),
  };
  if (partyGathering) payload.partyGathering = partyGathering;
  return payload;
};
