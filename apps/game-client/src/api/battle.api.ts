import {
  killsControllerCreateKill,
  type CreateKillDto,
  type CreateKillResponseDtoOutput,
} from "@lootlog/client/main";
import {
  battlesControllerCreateBattle,
  type CreateBattleDto,
  type BattleCreatedResponseDtoOutput,
} from "@lootlog/client/battlelog";
import { runSingleLoggedAction } from "@/lib/logs/log-actions";
import { GAME_EVENT_RETRY_OPTIONS } from "@/api/retry-policy";

export async function createKill(
  params: CreateKillDto,
): Promise<CreateKillResponseDtoOutput> {
  const response = await runSingleLoggedAction({
    actionType: "create_kill",
    actionPayload: params,
    request: {
      method: "POST",
      endpoint: "/kills",
      payload: params,
    },
    execute: () => killsControllerCreateKill(params),
    retry: GAME_EVENT_RETRY_OPTIONS,
  });

  return response;
}

/** The contract accepts a submission id; the Game client always sends one. */
export type CreateBattleOptions = CreateBattleDto & {
  submissionId: string;
};

export async function createBattle(
  options: CreateBattleOptions,
): Promise<BattleCreatedResponseDtoOutput> {
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
    execute: () => battlesControllerCreateBattle(options),
    retry: GAME_EVENT_RETRY_OPTIONS,
  });

  return response;
}
