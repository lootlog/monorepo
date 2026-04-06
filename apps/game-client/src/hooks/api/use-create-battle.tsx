import { useMutation } from "@tanstack/react-query";
import { useAuthenticatedApiClient } from "@/hooks/api/use-api-client";
import type {
  GameEvent,
  MatchSummary,
  F,
} from "@lootlog/margonem-types/game-events";
import { toast } from "sonner";
import { LOOTLOG_APP_URL } from "@/config/app";

export type BattleEventPayload = {
  f?: Pick<F, "m" | "endBattle" | "init" | "auto" | "w">;
  ev: number;
  party?: GameEvent["party"];
  match_summary?: Partial<MatchSummary>;
  matchmaking_state?: number;
};

export type UseCreateBattleOptions = {
  accountId: string;
  characterId: string;
  world: string;
  events: BattleEventPayload[];
};

export type CreateBattleResponse = {
  battleId: number;
};

export const useCreateBattle = () => {
  const { client } = useAuthenticatedApiClient("battlelog");

  const mutation = useMutation({
    mutationKey: ["create-battle"],
    mutationFn: (options: UseCreateBattleOptions) => {
      return client.post<CreateBattleResponse>("/battles", options);
    },
    onSuccess: (response) => {
      const battleUrl = `${LOOTLOG_APP_URL}/@me/battle-panel/battles/${response.data.battleId}`;

      toast("Walka została dodana", {
        duration: 10000,
        action: {
          label: "Kopiuj link",
          onClick: () => {
            navigator.clipboard.writeText(battleUrl);
            toast.success("Link skopiowany do schowka");
          },
        },
      });
    },
    onError: () => {
      console.log("onError");
    },
  });

  return mutation;
};
