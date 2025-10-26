import { useBattleLogApiClient } from "@/hooks/api/battle-log/use-battle-log-api-client";
import type { Battle } from "@/hooks/api/battle-log/use-battles";
import { useQuery } from "@tanstack/react-query";

export type GetBattleResponse = Battle;

export type UseBattleOptions = {
  battleId?: string;
  isPublic?: boolean;
};

export const useBattle = (options: UseBattleOptions) => {
  const { client } = useBattleLogApiClient();

  const endpoint = options.isPublic
    ? `/battles/public/${options.battleId}`
    : `/battles/${options.battleId}`;

  const query = useQuery({
    queryKey: [
      "battles",
      options.battleId,
      options.isPublic ? "public" : "private",
    ],
    queryFn: () => client.get<GetBattleResponse>(endpoint),
    enabled: !!options.battleId,
    select: (response) => response.data,
  });

  return query;
};
