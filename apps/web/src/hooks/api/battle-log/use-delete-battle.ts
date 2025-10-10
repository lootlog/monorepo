import { useBattleLogApiClient } from "@/hooks/api/battle-log/use-battle-log-api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export type DeleteBattleOptions = {
  battleId: string;
};

export type DeleteBattleResponse = unknown;

export const useDeleteBattle = () => {
  const { client } = useBattleLogApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ battleId }: DeleteBattleOptions) =>
      client.delete<DeleteBattleResponse>(`/battles/${battleId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["battles"] });
    },
  });
};
