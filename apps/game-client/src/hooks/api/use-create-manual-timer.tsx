import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthenticatedApiClient } from "@/hooks/api/use-api-client";
import { toast } from "sonner";

export type UseCreateManualTimerOptions = {
  name: string;
  minSeconds?: number;
  maxSeconds?: number;
  world: string;
  guildIds: string[];
  customMinSpawnTime?: Date;
  customMaxSpawnTime?: Date;
};

type CreateManualTimerResult = {
  successful: Array<{ guildId: string }>;
  failed: Array<{ guildId: string; error: string }>;
  totalGuilds: number;
  successCount: number;
  failureCount: number;
};

export const useCreateManualTimer = () => {
  const { client } = useAuthenticatedApiClient();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationKey: ["create-manual-timer"],
    mutationFn: async ({
      guildIds,
      ...rest
    }: UseCreateManualTimerOptions): Promise<CreateManualTimerResult> => {
      if (!guildIds || guildIds.length === 0) {
        throw new Error("Brak wybranych gildii");
      }

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
          await client.post(`/guilds/${guildId}/timers/manual`, payload);
          return { guildId };
        }),
      );

      const successful = results
        .filter(
          (r): r is PromiseFulfilledResult<{ guildId: string }> =>
            r.status === "fulfilled",
        )
        .map((r) => r.value);

      const failed = results
        .filter((r): r is PromiseRejectedResult => r.status === "rejected")
        .map((r, index) => {
          const reason = r.reason;
          return {
            guildId: guildIds[index],
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
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["guild-timers"] });

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
    },
    onError: (error: unknown) => {
      const errorMessage =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || "Nie udało się utworzyć timera";
      toast.error(errorMessage);
    },
  });

  return mutation;
};
