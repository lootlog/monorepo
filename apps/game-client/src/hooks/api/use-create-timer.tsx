import { useMutation } from "@tanstack/react-query";
import { useAuthenticatedApiClient } from "@/hooks/api/use-api-client";
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
  npcType?: NpcType;
};

type CreateTimerResult = {
  successful: Array<{ guildId: string; timer: Timer }>;
  failed: Array<{ guildId: string; error: string; errorKey?: string }>;
  totalGuilds: number;
  successCount: number;
  failureCount: number;
};

export const useCreateTimer = () => {
  const { client } = useAuthenticatedApiClient();

  const mutation = useMutation({
    mutationKey: ["create-timer"],
    mutationFn: async ({
      timer,
      guildIds,
    }: CreateTimerForGuildsParams): Promise<CreateTimerResult> => {
      if (!guildIds || guildIds.length === 0) {
        throw new Error("Brak wybranych gildii");
      }

      const results = await Promise.allSettled(
        guildIds.map(async (guildId) => {
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
      };
    },
  });

  return mutation;
};
