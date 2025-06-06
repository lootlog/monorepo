import { useAuthenticatedApiClient } from "@/hooks/api/use-api-client";
import { useGlobalStore } from "@/store/global.store";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export type UseUpdateLootlogCharacterSettings = {
  characterId: string;
  lootGuildIds: string[];
  timerGuildIds: string[];
};

export const useUpdateLootlogCharactersConfig = () => {
  const { client } = useAuthenticatedApiClient();
  const accountId = useGlobalStore((state) => state.gameState.accountId);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationKey: ["update-lootlog-characters-config"],
    mutationFn: (options: UseUpdateLootlogCharacterSettings) => {
      return client.put(
        `/users/@me/lootlog-config/accounts/${accountId}`,
        options
      );
    },
    onSuccess: () => {
      console.log("onSuccess");
      queryClient.invalidateQueries({
        queryKey: ["lootlog-characters-config"],
      });
      window.message("Zaktualizowano konfigurację postaci w Lootlogu");
    },
    onError: () => {
      console.log("onError");
    },
  });

  return mutation;
};
