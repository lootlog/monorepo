import { getApiClient } from "@/lib/api-client";
import { LOOTLOG_APP_URL } from "@/config/app";
import { toast } from "sonner";
import type {
  Item,
  MatchSummary,
  F,
  GameEvent,
} from "@lootlog/margonem/game-events";
import type { Npc, PartyMember } from "@/utils/game/get-battle-participants";

// --- Kill ---

export type KillNpcData = {
  id: number;
  name: string;
  icon?: string;
  prof?: string;
  lvl: number;
  wt: number;
};

export type CreateKillParams = {
  world: string;
  npc: KillNpcData;
  characterId: string;
  accountId: string;
};

type CreateKillResponse = {
  updated: number;
};

export async function createKill(
  params: CreateKillParams,
): Promise<CreateKillResponse> {
  const client = getApiClient("default");
  const response = await client.post<CreateKillResponse>("/kills", params);
  return response.data;
}

// --- Battle ---

export type BattleEventPayload = {
  f?: Pick<F, "m" | "endBattle" | "init" | "auto" | "w">;
  ev: number;
  party?: GameEvent["party"];
  match_summary?: Partial<MatchSummary>;
  matchmaking_state?: number;
};

export type CreateBattleOptions = {
  accountId: string;
  characterId: string;
  world: string;
  events: BattleEventPayload[];
};

export type CreateBattleResponse = {
  battleId: number;
};

export async function createBattle(
  options: CreateBattleOptions,
): Promise<CreateBattleResponse> {
  const client = getApiClient("battlelog");
  const response = await client.post<CreateBattleResponse>("/battles", options);

  const battleUrl = `${LOOTLOG_APP_URL}/@me/battle-panel/battles/${response.data.battleId}`;
  toast("Walka została dodana", {
    duration: 10000,
    action: {
      label: "Kopiuj link",
      onClick: () => {
        navigator.clipboard.writeText(battleUrl);
        toast.success("Link skopiowany do schowka");
      },
    },
  });

  return response.data;
}

// --- Loot ---

export type CreateLootOptions = {
  npcs: Npc[];
  players: PartyMember[];
  loots: Partial<Item>[];
  source: string;
  world: string;
  accountId: string;
  characterId: string;
  location: string;
};

export type CreateLootResponse = {
  id: number;
};

export async function createLoot(
  options: CreateLootOptions,
): Promise<CreateLootResponse> {
  const client = getApiClient("default");
  const response = await client.post<CreateLootResponse>("/loots", options);
  return response.data;
}

// --- Update Loot ---

export type UpdateLootOptions = {
  msg: string;
  id: number;
};

export async function updateLoot({
  id,
  ...rest
}: UpdateLootOptions): Promise<void> {
  const client = getApiClient("default");
  await client.patch(`/loots/${id}`, rest);
}

// --- Timer ---

export type CreateTimerNpc = {
  id: number;
  name: string;
  icon: string;
  prof: string;
  type: number;
  lvl: number;
  location: string;
  hpp: number;
  wt: number;
};

export type CreateTimerOptions = {
  respawnRandomness?: number;
  respBaseSeconds: number;
  characterId: string;
  accountId: string;
  world: string;
  customMinSpawnTime?: Date;
  customMaxSpawnTime?: Date;
  npc: CreateTimerNpc;
};

export type CreateTimerForGuildsParams = {
  timer: CreateTimerOptions;
  guildIds: string[];
};

export async function createTimerForGuilds({
  timer,
  guildIds,
}: CreateTimerForGuildsParams): Promise<void> {
  if (!guildIds || guildIds.length === 0) return;

  const client = getApiClient("default");

  await Promise.allSettled(
    guildIds.map((guildId) => {
      const payload = {
        respBaseSeconds: timer.respBaseSeconds,
        respawnRandomness: timer.respawnRandomness,
        world: timer.world,
        npc: timer.npc,
        characterId: timer.characterId,
        accountId: timer.accountId,
        ...(timer.customMinSpawnTime && {
          customMinSpawnTime: timer.customMinSpawnTime.toISOString(),
        }),
        ...(timer.customMaxSpawnTime && {
          customMaxSpawnTime: timer.customMaxSpawnTime.toISOString(),
        }),
      };
      return client.post(`/guilds/${guildId}/timers`, payload);
    }),
  );
}

// --- Chat Message ---

export enum MessageType {
  NORMAL = "NORMAL",
  NOTIFICATION = "NOTIFICATION",
  NPC = "NPC",
  PARTY_GATHERING = "PARTY_GATHERING",
}

export type ChatCharacterData = {
  nick: string;
  id: number;
  acc: number;
  lvl: number;
  prof: string;
  icon: string;
};

export type ChatNpc = {
  icon: string;
  id: number;
  x: number;
  y: number;
  hpp: number;
  name: string;
  prof: string;
  location: string;
  type: number;
  wt: number;
  lvl: number;
};

export type SendChatMessageOptions = {
  message: string;
  guildIds: string[];
  type: MessageType;
  characterData: ChatCharacterData;
  npc?: ChatNpc;
};

export async function sendChatMessage({
  message,
  guildIds,
  type,
  characterData,
  npc,
}: SendChatMessageOptions): Promise<void> {
  const client = getApiClient("default");

  const results = await Promise.allSettled(
    guildIds.map((guildId) =>
      client.post(`/guilds/${guildId}/chat-messages`, {
        message,
        type,
        characterData,
        npc,
      }),
    ),
  );

  const failures = results.filter((r) => r.status === "rejected");
  if (failures.length === results.length) {
    console.warn("Failed to send chat message to all guilds");
  } else if (failures.length > 0) {
    console.warn(`Failed to send chat message to ${failures.length} guilds`);
  }
}

// --- Notification ---

export type CreateNotificationOptions = {
  npc?: Npc;
  guildIds: string[];
  world: string;
  message?: string;
  isGatheringParty?: boolean;
};

export async function createNotification(
  options: CreateNotificationOptions,
): Promise<void> {
  const client = getApiClient("default");
  await client.post("/messaging", options);
}
