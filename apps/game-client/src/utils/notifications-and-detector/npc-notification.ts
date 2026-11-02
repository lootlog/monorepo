import type {
  MessageType as ChatMessageType,
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
import { isHeroTrackerName } from "@lootlog/domain/npc-type";

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
  world: string;
  npc: GameNpcWithLocation;
  guildIds: string[];
  messageType: ChatMessageType;
  message?: string;
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
  isHeroFromEvent: npc.isHeroFromEvent,
});

const buildHeroTrackerPayload = (
  npc: GameNpcWithLocation,
): CreateNotificationOptions["heroTracker"] => {
  if (!isHeroTrackerName(npc.nick)) return undefined;

  return npc.entranceClosesAt === undefined
    ? { state: "unclaimed" }
    : {
        state: "open",
        // The server stamps the close time on its clock for recipients.
        entranceSecondsLeft: Math.max(
          1,
          Math.round((npc.entranceClosesAt - Date.now()) / 1000),
        ),
      };
};

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

  const heroTracker = buildHeroTrackerPayload(npc);

  if (heroTracker) payload.heroTracker = heroTracker;

  if (isGatheringParty) {
    payload.isGatheringParty = isGatheringParty;
    payload.character = character;
  }

  return payload;
}

export const buildNpcChatMessagePayload = ({
  world,
  npc,
  guildIds,
  messageType,
  message = "",
}: BuildNpcChatMessagePayloadOptions): SendChatMessageOptions | null => {
  const characterData = buildChatCharacterData();

  // Chat NPC messages require a profession, which Hero Trackers lack.
  if (!characterData || !npc.prof) return null;

  const payload: SendChatMessageOptions = {
    message,
    guildIds,
    type: messageType,
    characterData,
    npc: { ...buildNotificationNpcPayload(npc), world },
  };

  return payload;
};
