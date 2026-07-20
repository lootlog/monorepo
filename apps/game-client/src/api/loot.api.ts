import { getApiClient } from "@/lib/api-client";
import {
  logLootCreateDebug,
  type LootCreateDebugContext,
} from "@/lib/loot-create-debug";
import { runSingleLoggedAction } from "@/lib/logs/log-actions";
import { GAME_EVENT_RETRY_OPTIONS } from "@/api/retry-policy";
import type { Item } from "@lootlog/margonem/game-events";
import type { Npc, PartyMember } from "@/utils/game/get-battle-participants";

export type LootDto = {
  id: number;
  hid: string;
  icon: string;
  name: string;
  pr: number;
  prc: string;
  stat: string;
  cl: number;
  own?: number;
};

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

type CreateLootGuildOutcome = {
  guildId: string;
  guildName: string;
};

type CreateLootRejectedGuild = CreateLootGuildOutcome & {
  reason:
    | "NOT_ON_CHARACTER_WHITELIST"
    | "MISSING_LOOTLOG_CONFIG"
    | "LOOT_NOT_ACCEPTED_BY_CONFIG"
    | "MISSING_MEMBER";
};

type CreateLootResponse = {
  id: number;
  submittedGuilds: CreateLootGuildOutcome[];
  rejectedGuilds: CreateLootRejectedGuild[];
};

export async function createLoot(
  options: CreateLootOptions,
  debugContext: LootCreateDebugContext,
): Promise<CreateLootResponse> {
  const client = getApiClient("default");
  let attempt = 0;
  const response = await runSingleLoggedAction({
    actionType: "create_loot",
    actionPayload: options,
    request: {
      method: "POST",
      endpoint: "/loots",
      payload: options,
    },
    execute: async () => {
      attempt += 1;
      logLootCreateDebug("http-request", {
        ...debugContext,
        attempt,
        endpoint: "/loots",
        method: "POST",
        payload: options,
      });

      try {
        const requestResponse = await client.post<CreateLootResponse>(
          "/loots",
          options,
        );
        logLootCreateDebug("http-success", {
          ...debugContext,
          attempt,
          response: requestResponse.data,
        });
        return requestResponse;
      } catch (error) {
        logLootCreateDebug("http-error", {
          ...debugContext,
          attempt,
          error,
        });
        throw error;
      }
    },
    retry: GAME_EVENT_RETRY_OPTIONS,
  });

  return response.data;
}

export type UpdateLootOptions = {
  msg: string;
  id: number;
};

export async function updateLoot({
  id,
  ...rest
}: UpdateLootOptions): Promise<void> {
  const client = getApiClient("default");

  await runSingleLoggedAction({
    actionType: "update_loot",
    actionPayload: { id, ...rest },
    request: {
      method: "PATCH",
      endpoint: `/loots/${id}`,
      payload: rest,
    },
    execute: () => client.patch(`/loots/${id}`, rest),
  });
}
