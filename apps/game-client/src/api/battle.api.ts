import { createApiClient } from "@lootlog/client/transport";
import { runSingleLoggedAction } from "@/lib/logs/log-actions";
import { GAME_EVENT_RETRY_OPTIONS } from "@/api/retry-policy";
import type {
  F,
  GameEvent,
  MatchSummary,
  W,
} from "@lootlog/margonem/game-events";

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
  const client = createApiClient("main");
  const response = await runSingleLoggedAction({
    actionType: "create_kill",
    actionPayload: params,
    request: {
      method: "POST",
      endpoint: "/kills",
      payload: params,
    },
    execute: () => client.post<CreateKillResponse>("/kills", params),
    retry: GAME_EVENT_RETRY_OPTIONS,
  });

  return response;
}

export type BattleEventWarriorPayload = Pick<
  W[string],
  "originalId" | "name" | "lvl" | "prof" | "icon" | "team"
>;

type BattleEventFightPayload = Pick<F, "m" | "endBattle" | "init" | "auto"> & {
  w?: Record<string, BattleEventWarriorPayload>;
};

export type BattleEventPayload = {
  f?: BattleEventFightPayload;
  ev?: number;
  party?: GameEvent["party"];
  match_summary?: Partial<MatchSummary>;
  matchmaking_state?: number;
};

export type CreateBattleOptions = {
  accountId: string;
  characterId: string;
  submissionId: string;
  world: string;
  events: BattleEventPayload[];
};

type CreateBattleResponse = {
  battleId: string;
};

export async function createBattle(
  options: CreateBattleOptions,
): Promise<CreateBattleResponse> {
  const client = createApiClient("battlelog");
  const { events, ...battleContext } = options;
  const response = await runSingleLoggedAction({
    actionType: "create_battle",
    actionPayload: {
      ...battleContext,
      eventCount: events.length,
    },
    request: {
      method: "POST",
      endpoint: "/battles",
      payload: options,
    },
    execute: () => client.post<CreateBattleResponse>("/battles", options),
    retry: GAME_EVENT_RETRY_OPTIONS,
  });

  return response;
}
