import {
  lootsControllerCreateLoot,
  lootsControllerUpdateLoot,
  type CreateLootDto,
  type CreateLootResponseDtoOutput,
  type UpdateLootDto,
} from "@lootlog/client/main";
import {
  logLootCreateDebug,
  type LootCreateDebugContext,
} from "@/lib/loot-create-debug";
import { runSingleLoggedAction } from "@/lib/logs/log-actions";
import { GAME_EVENT_RETRY_OPTIONS } from "@/api/retry-policy";
import { requireLocation } from "./require-location";

export async function createLoot(
  options: CreateLootDto,
  debugContext: LootCreateDebugContext,
): Promise<CreateLootResponseDtoOutput> {
  const { mapPlayersSnapshot: _mapPlayersSnapshot, ...loggedOptions } = options;
  let attempt = 0;

  const response = await runSingleLoggedAction({
    actionType: "create_loot",
    actionPayload: loggedOptions,
    request: {
      method: "POST",
      endpoint: "/loots",
      payload: loggedOptions,
    },
    execute: async () => {
      requireLocation(options.location);

      for (const npc of options.npcs) requireLocation(npc.location);

      attempt += 1;
      logLootCreateDebug("http-request", {
        ...debugContext,
        attempt,
        endpoint: "/loots",
        method: "POST",
        payload: loggedOptions,
      });

      try {
        const requestResponse = await lootsControllerCreateLoot(options);

        logLootCreateDebug("http-success", {
          ...debugContext,
          attempt,
          response: requestResponse,
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

  return response;
}

export async function updateLoot({
  id,
  ...rest
}: UpdateLootDto & { id: number }): Promise<void> {
  await runSingleLoggedAction({
    actionType: "update_loot",
    actionPayload: { id, ...rest },
    request: {
      method: "PATCH",
      endpoint: `/loots/${id}`,
      payload: rest,
    },
    execute: () => lootsControllerUpdateLoot({ id }, rest),
  });
}
