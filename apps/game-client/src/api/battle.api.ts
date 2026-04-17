import { getApiClient } from "@/lib/api-client";
import { runSingleLoggedAction } from "@/lib/logs/log-actions";
import type { F, GameEvent, MatchSummary } from "@lootlog/margonem/game-events";

type KillNpcData = {
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
  const response = await runSingleLoggedAction({
    actionType: "create_kill",
    actionPayload: params,
    request: {
      method: "POST",
      endpoint: "/kills",
      payload: params,
    },
    execute: () => client.post<CreateKillResponse>("/kills", params),
  });

  return response.data;
}

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

type CreateBattleResponse = {
  battleId: number;
};

export async function createBattle(
  options: CreateBattleOptions,
): Promise<CreateBattleResponse> {
  const client = getApiClient("battlelog");
  const response = await runSingleLoggedAction({
    actionType: "create_battle",
    actionPayload: options,
    request: {
      method: "POST",
      endpoint: "/battles",
      payload: options,
    },
    execute: () => client.post<CreateBattleResponse>("/battles", options),
  });

  return response.data;
}
