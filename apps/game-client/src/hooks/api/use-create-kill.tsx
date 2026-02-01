import { useMutation } from "@tanstack/react-query";
import { useAuthenticatedApiClient } from "@/hooks/api/use-api-client";

export type KillNpcData = {
  id: number;
  name: string;
  icon?: string;
  prof?: string;
  type: number;
  lvl: number;
  wt: number;
};

export type UseCreateKillOptions = {
  world: string;
  npc: KillNpcData;
  characterId: string;
  accountId: string;
  characterName: string;
  characterLvl: number;
  characterProf?: string;
  characterIcon?: string;
};

type CreateKillForGuildsParams = {
  kill: UseCreateKillOptions;
  guildIds: string[];
};

type CreateKillResponse = {
  killId: string;
  isNewKill: boolean;
  guildKillId: string;
};

type CreateKillResult = {
  successful: Array<{ guildId: string; response: CreateKillResponse }>;
  failed: Array<{ guildId: string; error: string }>;
  totalGuilds: number;
  successCount: number;
  failureCount: number;
};

export const useCreateKill = () => {
  const { client } = useAuthenticatedApiClient();

  const mutation = useMutation({
    mutationKey: ["create-kill"],
    mutationFn: async ({
      kill,
      guildIds,
    }: CreateKillForGuildsParams): Promise<CreateKillResult> => {
      if (!guildIds || guildIds.length === 0) {
        return {
          successful: [],
          failed: [],
          totalGuilds: 0,
          successCount: 0,
          failureCount: 0,
        };
      }

      const results = await Promise.allSettled(
        guildIds.map(async (guildId) => {
          const payload = {
            world: kill.world,
            npc: kill.npc,
            characterId: kill.characterId,
            accountId: kill.accountId,
            characterName: kill.characterName,
            characterLvl: kill.characterLvl,
            characterProf: kill.characterProf,
            characterIcon: kill.characterIcon,
          };
          const response = await client.post<CreateKillResponse>(
            `/guilds/${guildId}/kills`,
            payload,
          );
          return { guildId, response: response.data };
        }),
      );

      const successful = results
        .filter(
          (
            r,
          ): r is PromiseFulfilledResult<{
            guildId: string;
            response: CreateKillResponse;
          }> => r.status === "fulfilled",
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
