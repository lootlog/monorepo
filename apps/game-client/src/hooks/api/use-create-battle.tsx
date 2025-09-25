import { useMutation } from "@tanstack/react-query";
import { useAuthenticatedApiClient } from "@/hooks/api/use-api-client";
import { GameEvent } from "@/types/margonem/game-events/game-event";

export type UseCreateBattleOptions = {
  accountId: string;
  characterId: string;
  world: string;
  events: Pick<GameEvent, "f" | "ev" | "party">[];
};

export type CreateBattleResponse = {
  id: number;
};

export const useCreateBattle = () => {
  const { client } = useAuthenticatedApiClient("battlelog");

  const mutation = useMutation({
    mutationKey: ["create-battle"],
    mutationFn: (options: UseCreateBattleOptions) => {
      return client.post<CreateBattleResponse>("/battles", options);
    },
    onSuccess: () => {
      console.log("onSuccess");
    },
    onError: () => {
      console.log("onError");
    },
  });

  return mutation;
};
