import { stringify } from "qs";
import { getApiClient } from "@/lib/api-client";
import i18n from "@/i18n/config";
import {
  getAggregateActionStatus,
  getErrorMessage,
  runLoggedRequest,
  runSingleLoggedAction,
  startLoggedAction,
} from "@/lib/logs/log-actions";
import type { GuildMember } from "@/types/guild-member";
import type { Npc } from "./npcs.api";

type CreateTimerNpc = {
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

type CreateTimerOptions = {
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

export type CreateAutoTimerResponse = {
  submittedGuilds: Array<{ guildId: string; guildName: string }>;
  rejectedGuilds: Array<{
    guildId: string;
    guildName: string;
    reason: "NOT_ON_CATCHING_WHITELIST" | "TIMER_CREATE_FAILED";
  }>;
};

export async function createTimerForGuilds({
  timer,
  guildIds,
}: CreateTimerForGuildsParams): Promise<void> {
  const action = startLoggedAction({
    actionType: "create_timer",
    payload: {
      timer,
      guildIds,
    },
  });

  if (!guildIds || guildIds.length === 0) {
    action.complete({
      status: "error",
      details: {
        endpoint: "/guilds/:guildId/timers",
        reason: "missing_guild_ids",
      },
    });

    return;
  }

  const client = getApiClient("default");
  const results = await Promise.allSettled(
    guildIds.map(async (guildId) => {
      const endpoint = `/guilds/${guildId}/timers`;
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

      await runLoggedRequest({
        action,
        method: "POST",
        endpoint,
        payload,
        request: () => client.post(endpoint, payload),
      });

      return { guildId };
    }),
  );

  const successCount = results.filter(
    (result) => result.status === "fulfilled",
  ).length;
  const failureCount = results.length - successCount;

  action.complete({
    status: getAggregateActionStatus(successCount, failureCount),
    details: {
      endpoint: "/guilds/:guildId/timers",
      totalRequests: results.length,
      successCount,
      failureCount,
      guildIds,
    },
  });

  if (failureCount === results.length) {
    throw new Error("Failed to create timer for all guilds");
  }
}

export async function createAutoTimer(
  timer: CreateTimerOptions,
): Promise<CreateAutoTimerResponse> {
  const client = getApiClient("default");
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

  const response = await runSingleLoggedAction({
    actionType: "create_timer",
    actionPayload: timer,
    request: {
      method: "POST",
      endpoint: "/timers/auto",
      payload,
    },
    execute: () =>
      client.post<CreateAutoTimerResponse>("/timers/auto", payload),
  });

  return response.data;
}

export type CreateManualTimerOptions = {
  name: string;
  minSeconds?: number;
  maxSeconds?: number;
  world: string;
  guildIds: string[];
  customMinSpawnTime?: Date;
  customMaxSpawnTime?: Date;
};

export type CreateManualTimerResult = {
  successful: Array<{ guildId: string }>;
  failed: Array<{ guildId: string; error: string }>;
  totalGuilds: number;
  successCount: number;
  failureCount: number;
};

export async function createManualTimer({
  guildIds,
  ...rest
}: CreateManualTimerOptions): Promise<CreateManualTimerResult> {
  const action = startLoggedAction({
    actionType: "create_manual_timer",
    payload: {
      guildIds,
      ...rest,
    },
  });

  if (!guildIds || guildIds.length === 0) {
    action.complete({
      status: "error",
      details: {
        endpoint: "/guilds/:guildId/timers/manual",
        reason: "missing_guild_ids",
      },
    });

    throw new Error(i18n.t("timers.addForm.guildRequired"));
  }

  const client = getApiClient("default");
  const results = await Promise.allSettled(
    guildIds.map(async (guildId) => {
      const payload = {
        ...rest,
        ...(rest.customMinSpawnTime && {
          customMinSpawnTime: rest.customMinSpawnTime.toISOString(),
        }),
        ...(rest.customMaxSpawnTime && {
          customMaxSpawnTime: rest.customMaxSpawnTime.toISOString(),
        }),
      };

      await runLoggedRequest({
        action,
        method: "POST",
        endpoint: `/guilds/${guildId}/timers/manual`,
        payload,
        request: () => client.post(`/guilds/${guildId}/timers/manual`, payload),
      });

      return { guildId };
    }),
  );

  const successful: Array<{ guildId: string }> = [];
  const failed: Array<{ guildId: string; error: string }> = [];

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      successful.push(result.value);
      return;
    }

    failed.push({
      guildId: guildIds[index],
      error: getErrorMessage(result.reason),
    });
  });

  action.complete({
    status: getAggregateActionStatus(successful.length, failed.length),
    details: {
      endpoint: "/guilds/:guildId/timers/manual",
      totalRequests: guildIds.length,
      successCount: successful.length,
      failureCount: failed.length,
      guildIds,
    },
  });

  return {
    successful,
    failed,
    totalGuilds: guildIds.length,
    successCount: successful.length,
    failureCount: failed.length,
  };
}

export type Timer = {
  minSpawnTime: Date;
  maxSpawnTime: Date;
  npc: Npc;
  npcId: number;
  timerKey: string;
  member: GuildMember;
  members?: GuildMember[];
  world: string;
  guildId: string;
  isCustomTime?: boolean;
  isPending?: boolean;
  wasReset?: boolean;
  updatedAt?: Date;
};

export async function fetchTimers(world: string): Promise<Timer[]> {
  const client = getApiClient("default");
  const queryString = stringify({ world });
  const response = await client.get<Timer[]>(`/timers?${queryString}`);

  return response.data;
}

export type DeleteTimerOptions = {
  timerKey: string;
  guildId: string;
  world?: string;
};

export async function deleteTimer({
  guildId,
  timerKey,
  world,
}: DeleteTimerOptions): Promise<void> {
  const client = getApiClient("default");
  const endpoint = `/guilds/${guildId}/timers/${timerKey}?world=${world}`;

  await runSingleLoggedAction({
    actionType: "delete_timer",
    actionPayload: { guildId, timerKey, world },
    request: {
      method: "DELETE",
      endpoint,
      payload: { guildId, timerKey, world },
    },
    execute: () => client.delete(endpoint),
  });
}

export type ResetTimerOptions = {
  world: string;
  timerKey: string;
  guildId: string;
};

export async function resetTimer({
  guildId,
  timerKey,
  ...rest
}: ResetTimerOptions): Promise<void> {
  const client = getApiClient("default");
  const endpoint = `/guilds/${guildId}/timers/${timerKey}/reset`;

  await runSingleLoggedAction({
    actionType: "reset_timer",
    actionPayload: { guildId, timerKey, ...rest },
    request: {
      method: "PATCH",
      endpoint,
      payload: rest,
    },
    execute: () => client.patch(endpoint, rest),
  });
}
