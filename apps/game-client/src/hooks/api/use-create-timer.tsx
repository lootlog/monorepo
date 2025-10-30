import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AxiosResponse } from "axios";
import { useAuthenticatedApiClient } from "@/hooks/api/use-api-client";
import { toast } from "sonner";
import type { Timer } from "@/hooks/api/use-timers";
import type { NpcType } from "@/hooks/api/use-npcs";

export type UseCreateTimerOptions = {
  respawnRandomness?: number;
  respBaseSeconds: number;
  characterId: string;
  accountId: string;
  world: string;
  customMinSpawnTime?: Date;
  customMaxSpawnTime?: Date;
  npc: {
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
};

type CreateTimerForGuildsParams = {
  timer: UseCreateTimerOptions;
  guildIds: string[];
  tempIds: string[];
  npcType?: NpcType;
};

type CreateTimerResult = {
  successful: Array<{ guildId: string; timer: Timer }>;
  failed: Array<{ guildId: string; error: string; errorKey?: string }>;
  totalGuilds: number;
  successCount: number;
  failureCount: number;
  tempIds: string[];
};

const calculateSpawnTimes = (
  timer: UseCreateTimerOptions,
): { minSpawnTime: Date; maxSpawnTime: Date } => {
  if (timer.customMinSpawnTime && timer.customMaxSpawnTime) {
    return {
      minSpawnTime: timer.customMinSpawnTime,
      maxSpawnTime: timer.customMaxSpawnTime,
    };
  }

  const now = new Date();
  const respawnRandomness = timer.respawnRandomness ?? 0;
  const minSpawnTime = new Date(now.getTime() + timer.respBaseSeconds * 1000);
  const maxSpawnTime = new Date(
    minSpawnTime.getTime() + respawnRandomness * 1000,
  );

  return { minSpawnTime, maxSpawnTime };
};

export const useCreateTimer = () => {
  const { client } = useAuthenticatedApiClient();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationKey: ["create-timer"],
    mutationFn: async ({
      timer,
      guildIds,
      tempIds,
    }: CreateTimerForGuildsParams): Promise<CreateTimerResult> => {
      if (!guildIds || guildIds.length === 0) {
        throw new Error("Brak wybranych gildii");
      }

      const results = await Promise.allSettled(
        guildIds.map(async (guildId, index) => {
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
            tempId: tempIds[index],
          };
          const response = await client.post<Timer>(
            `/guilds/${guildId}/timers`,
            payload,
          );
          return { guildId, timer: response.data };
        }),
      );

      const successful = results
        .filter(
          (r): r is PromiseFulfilledResult<{ guildId: string; timer: Timer }> =>
            r.status === "fulfilled",
        )
        .map((r) => r.value);

      const failed = results
        .filter((r): r is PromiseRejectedResult => r.status === "rejected")
        .map((r) => {
          const reason = r.reason;
          return {
            guildId: guildIds[
              results.findIndex((result) => result === r)
            ] as string,
            error:
              reason?.response?.data?.message ||
              reason?.message ||
              "Unknown error",
            errorKey: reason?.response?.data?.errorKey,
          };
        });

      return {
        successful,
        failed,
        totalGuilds: guildIds.length,
        successCount: successful.length,
        failureCount: failed.length,
        tempIds,
      };
    },
    onMutate: async ({ timer, guildIds, tempIds, npcType }) => {
      await queryClient.cancelQueries({ queryKey: ["guild-timers"] });

      const previousTimers = queryClient.getQueryData<AxiosResponse<Timer[]>>([
        "guild-timers",
        timer.world,
      ]);

      const { minSpawnTime, maxSpawnTime } = calculateSpawnTimes(timer);

      const optimisticTimers = guildIds.map((guildId, index) => ({
        id: 0,
        tempId: tempIds[index],
        isPending: true,
        minSpawnTime,
        maxSpawnTime,
        npc: {
          id: timer.npc.id,
          name: timer.npc.name,
          icon: timer.npc.icon,
          prof: timer.npc.prof,
          type: npcType ?? ("COMMON" as NpcType),
          lvl: timer.npc.lvl,
          location: timer.npc.location,
          hpp: timer.npc.hpp,
          wt: timer.npc.wt,
          margonemType: timer.npc.type,
        },
        npcId: timer.npc.id,
        member: {
          id: 0,
          userId: timer.characterId,
          name: "",
          type: "",
          guildId,
        },
        world: timer.world,
        guildId,
        isCustomTime: !!(timer.customMinSpawnTime && timer.customMaxSpawnTime),
      })) satisfies Timer[];

      queryClient.setQueryData<AxiosResponse<Timer[]>>(
        ["guild-timers", timer.world],
        (old) => {
          const existingTimers = old?.data || [];
          return {
            data: [...existingTimers, ...optimisticTimers],
          } as AxiosResponse<Timer[]>;
        },
      );

      return { previousTimers, optimisticTimers };
    },
    onError: (_error, variables, context) => {
      if (context?.previousTimers) {
        queryClient.setQueryData(
          ["guild-timers", variables.timer.world],
          context.previousTimers,
        );
      }
      toast.error("Nie udało się utworzyć timera");
    },
    onSuccess: (result, variables, context) => {
      if (context?.optimisticTimers && result.tempIds) {
        queryClient.setQueryData<AxiosResponse<Timer[]>>(
          ["guild-timers", variables.timer.world],
          (old) => {
            const existingTimers = old?.data || [];

            const successfulTempIds = result.successful.map(
              (s) => s.timer.tempId,
            );
            const failedTempIds = context.optimisticTimers
              .filter((t) => result.failed.some((f) => f.guildId === t.guildId))
              .map((t) => t.tempId);

            const updatedTimers = existingTimers.map((timer) => {
              if (timer.tempId && successfulTempIds.includes(timer.tempId)) {
                const realTimer = result.successful.find(
                  (s) => s.timer.tempId === timer.tempId,
                )?.timer;
                return realTimer ?? timer;
              }
              return timer;
            });

            const filteredTimers = updatedTimers.filter(
              (t) => !t.tempId || !failedTempIds.includes(t.tempId),
            );

            return { data: filteredTimers } as AxiosResponse<Timer[]>;
          },
        );
      }

      if (result.failureCount === 0) {
        toast.success(
          `Timer utworzony w ${result.successCount} ${result.successCount === 1 ? "gildii" : "gildiach"}`,
        );
      } else if (result.successCount === 0) {
        toast.error("Nie udało się utworzyć timera w żadnej gildii");
      } else {
        toast.warning(
          `Timer utworzony w ${result.successCount}/${result.totalGuilds} gildiach`,
        );
      }

      if (result.failed.length > 0) {
        result.failed.forEach((failure) => {
          if (failure.errorKey) {
            // Log failure details for debugging
          }
        });
      }
    },
  });

  return mutation;
};
