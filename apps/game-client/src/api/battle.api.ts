import {
  killsControllerCreateKill,
  type CreateKillDto,
  type CreateKillResponseDtoOutput,
} from "@lootlog/client/main";
import {
  battlesControllerCreateBattle,
  type CreateBattleDto,
  type CreateBattleDtoEventsItem,
  type CreateBattleDtoEventsItemFW,
  type BattleCreatedResponseDtoOutput,
} from "@lootlog/client/battlelog";
import { runSingleLoggedAction } from "@/lib/logs/log-actions";
import { GAME_EVENT_RETRY_OPTIONS } from "@/api/retry-policy";

export type CreateKillParams = CreateKillDto;

export type CreateKillResponse = CreateKillResponseDtoOutput;

export async function createKill(
  params: CreateKillParams,
): Promise<CreateKillResponse> {
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

export type BattleEventWarriorPayload = CreateBattleDtoEventsItemFW[string];

export type BattleEventPayload = CreateBattleDtoEventsItem;

export type CreateBattleOptions = CreateBattleDto & {
  submissionId: string;
};

export type CreateBattleResponse = BattleCreatedResponseDtoOutput;

export async function createBattle(
  options: CreateBattleOptions,
): Promise<CreateBattleResponse> {
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
