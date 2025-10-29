import { useMutation } from "@tanstack/react-query";
import { useAuthenticatedApiClient } from "@/hooks/api/use-api-client";
import { toast } from "sonner";

export type UseCreateTimerOptions = {
  name: string;
  respBaseSeconds: number;
  respawnRandomness: number;
  world: string;
  guildId: string;
  customMinSpawnTime?: Date;
  customMaxSpawnTime?: Date;
};

export const useCreateManualTimer = () => {
  const { client } = useAuthenticatedApiClient();

  const mutation = useMutation({
    mutationKey: ["create-manual-timer"],
    mutationFn: ({ guildId, ...rest }: UseCreateTimerOptions) =>
      client.post(`/guilds/${guildId}/timers/manual`, rest),
    onSuccess: () => {
      toast.success("Timer został dodany pomyślnie");
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
