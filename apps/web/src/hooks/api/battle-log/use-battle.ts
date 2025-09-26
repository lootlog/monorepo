import { useBattleLogApiClient } from "@/hooks/api/battle-log/use-battle-log-api-client";
import { Battle } from "@/hooks/api/battle-log/use-battles";
import { useQuery } from "@tanstack/react-query";

export type GetBattleResponse = Battle;

export type UseBattleOptions = {
  battleId?: string;
};

export const useBattle = (options: UseBattleOptions) => {
  const { client } = useBattleLogApiClient();

  const query = useQuery({
    queryKey: ["battles", options.battleId],
    queryFn: () =>
      client.get<GetBattleResponse>(`/battles/${options.battleId}`),
    enabled: !!options.battleId,
    select: (response) => response.data,
  });

  return query;
};
