import {
  timersControllerCreateManualTimer,
  timersControllerCreateAutoTimer,
  timersControllerDeleteTimer,
  timersControllerGetAllTimers,
  timersControllerResetTimer,
} from "@/lib/api/generated/main/timers/timers";
import type {
  CreateAutoTimerResponseDtoOutput,
  CreateManualTimerDto,
  CreateTimerFromGameClientDto,
  TimerResponseDto,
} from "@/lib/api/generated/main/model";
import {
  buildCurrentTimerActorCharacterPayload,
  normalizeTimerMember,
  normalizeTimerNpc,
} from "@/lib/api/generated-helpers";
import type { GuildMember } from "@/types/guild-member";
import {
  getAggregateActionStatus,
  getErrorMessage,
  runLoggedRequest,
  runSingleLoggedAction,
  startLoggedAction,
} from "@/lib/logs/log-actions";

type CreateTimerNpc = NonNullable<CreateTimerFromGameClientDto["npc"]>;

type CreateTimerOptions = {
  respawnRandomness?: number;
  respBaseSeconds: number;
  characterId: string;
  accountId: string;
  world: string;
  customMinSpawnTime?: Date;
  customMaxSpawnTime?: Date;
  npc: CreateTimerNpc;
  actorCharacter?: ReturnType<typeof buildCurrentTimerActorCharacterPayload>;
};

export type CreateAutoTimerResponse = CreateAutoTimerResponseDtoOutput;

export function createAutoTimer(
  timer: CreateTimerOptions,
): Promise<CreateAutoTimerResponse> {
  const payload = {
    respBaseSeconds: timer.respBaseSeconds,
    ...(timer.respawnRandomness !== undefined && {
      respawnRandomness: timer.respawnRandomness,
    }),
    world: timer.world,
    npc: timer.npc,
    characterId: timer.characterId,
    accountId: timer.accountId,
    actorCharacter:
      timer.actorCharacter ?? buildCurrentTimerActorCharacterPayload(),
    ...(timer.customMinSpawnTime && {
      customMinSpawnTime: timer.customMinSpawnTime.toISOString(),
    }),
    ...(timer.customMaxSpawnTime && {
      customMaxSpawnTime: timer.customMaxSpawnTime.toISOString(),
    }),
  } as Partial<CreateTimerFromGameClientDto> as CreateTimerFromGameClientDto;

  return runSingleLoggedAction({
    actionType: "create_timer",
    actionPayload: timer,
    request: {
      method: "POST",
      endpoint: "/timers/auto",
      payload,
    },
    execute: () => timersControllerCreateAutoTimer(payload),
  });
}

export type CreateManualTimerOptions = {
  name: string;
  minSeconds?: number;
  maxSeconds?: number;
  lvl?: number;
  prof?: string;
  type?: CreateManualTimerDto["type"];
  world: string;
  guildIds: string[];
  customMinSpawnTime?: Date;
  customMaxSpawnTime?: Date;
  actorCharacter?: ReturnType<typeof buildCurrentTimerActorCharacterPayload>;
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

    throw new Error("Brak wybranych gildii");
  }

  const results = await Promise.allSettled(
    guildIds.map(async (guildId) => {
      const payload: CreateManualTimerDto = {
        name: rest.name,
        ...(rest.minSeconds !== undefined && {
          minSeconds: rest.minSeconds,
        }),
        ...(rest.maxSeconds !== undefined && {
          maxSeconds: rest.maxSeconds,
        }),
        ...(rest.lvl !== undefined && {
          lvl: rest.lvl,
        }),
        ...(rest.prof !== undefined && {
          prof: rest.prof,
        }),
        ...(rest.type !== undefined && {
          type: rest.type,
        }),
        actorCharacter:
          rest.actorCharacter ?? buildCurrentTimerActorCharacterPayload(),
        world: rest.world,
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
        request: () => timersControllerCreateManualTimer({ guildId }, payload),
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

export type Timer = Omit<TimerResponseDto, "npc" | "member"> & {
  npc: ReturnType<typeof normalizeTimerNpc>;
  member?: GuildMember;
  actorCharacter?: TimerResponseDto["actorCharacter"];
  members?: GuildMember[];
  actorCharactersByMemberId?: Record<
    string,
    TimerResponseDto["actorCharacter"]
  >;
  isCustomTime?: boolean;
  isPending?: boolean;
};

const normalizeTimer = (timer: TimerResponseDto): Timer => {
  const member = normalizeTimerMember(timer.member);

  return {
    ...timer,
    npc: normalizeTimerNpc(timer.npc),
    member,
    actorCharactersByMemberId:
      member && timer.actorCharacter
        ? { [String(member.id)]: timer.actorCharacter }
        : undefined,
  };
};

export const normalizeTimerResponse = normalizeTimer;

export async function fetchTimers(world: string): Promise<Timer[]> {
  const timers = await timersControllerGetAllTimers({ world });

  return timers.map(normalizeTimer);
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
  const endpoint = `/guilds/${guildId}/timers/${timerKey}?world=${world}`;

  await runSingleLoggedAction({
    actionType: "delete_timer",
    actionPayload: { guildId, timerKey, world },
    request: {
      method: "DELETE",
      endpoint,
      payload: { guildId, timerKey, world },
    },
    execute: () =>
      timersControllerDeleteTimer(
        { guildId, timerIdentifier: timerKey },
        world ? { world } : undefined,
      ),
  });
}

export type ResetTimerOptions = {
  world: string;
  timerKey: string;
  guildId: string;
};

export function resetTimer({
  guildId,
  timerKey,
  ...rest
}: ResetTimerOptions): Promise<Timer> {
  const endpoint = `/guilds/${guildId}/timers/${timerKey}/reset`;
  const payload = {
    ...rest,
    actorCharacter: buildCurrentTimerActorCharacterPayload(),
  };

  return runSingleLoggedAction({
    actionType: "reset_timer",
    actionPayload: { guildId, timerKey, ...payload },
    request: {
      method: "PATCH",
      endpoint,
      payload,
    },
    execute: async () =>
      normalizeTimer(
        await timersControllerResetTimer(
          { guildId, timerIdentifier: timerKey },
          payload,
        ),
      ),
  });
}
