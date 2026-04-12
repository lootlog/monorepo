import type { Battle } from "@/hooks/api/battle-log/use-battles";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { battlelogApiClient } from "@/lib/api-client/api-client";

export type GetBattleResponse = Battle;

export type UseBattleOptions = {
  battleId?: string;
  isPublic?: boolean;
};

export const battleQueryOptions = ({
  battleId,
  isPublic = false,
}: UseBattleOptions) => {
  const endpoint = isPublic
    ? `/battles/public/${battleId}`
    : `/battles/${battleId}`;

  return queryOptions({
    queryKey: queryKeys.battleLog.battle(battleId, isPublic),
    queryFn: async () => {
      const response =
        await battlelogApiClient.get<GetBattleResponse>(endpoint);
      return response;
    },
    enabled: !!battleId,
  });
};

export const useBattle = (options: UseBattleOptions) => {
  return useQuery(battleQueryOptions(options));
};
