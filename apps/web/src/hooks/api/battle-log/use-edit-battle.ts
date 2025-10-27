import { useBattleLogApiClient } from "@/hooks/api/battle-log/use-battle-log-api-client";
import type { Battle } from "@/hooks/api/battle-log/use-battles";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export type EditBattleOptions = {
  battleId: string;
  data: {
    public: boolean;
  };
};

export type EditBattleResponse = Battle;

export const useEditBattle = () => {
  const { client } = useBattleLogApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ battleId, data }: EditBattleOptions) =>
      client.patch<EditBattleResponse>(`/battles/${battleId}`, data),
    onSuccess: (battle) => {
      queryClient.invalidateQueries({
        queryKey: ["battles", battle.data.id],
      });
    },
  });
};
