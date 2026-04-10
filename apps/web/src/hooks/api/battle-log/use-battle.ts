import { useBattleLogApiClient } from "@/hooks/api/battle-log/use-battle-log-api-client";
import type { Battle } from "@/hooks/api/battle-log/use-battles";
import { queryOptions, useQuery } from "@tanstack/react-query";
import {
  battlelogApiClient,
  type ApiRequestConfig,
} from "@/lib/api-client/api-client";

export type GetBattleResponse = Battle;

export type UseBattleOptions = {
  battleId?: string;
  isPublic?: boolean;
  suppressRouteErrorToast?: boolean;
};

export const battleQueryOptions = ({
  battleId,
  isPublic = false,
  suppressRouteErrorToast = false,
}: UseBattleOptions) => {
  const endpoint = isPublic
    ? `/battles/public/${battleId}`
    : `/battles/${battleId}`;

  return queryOptions({
    queryKey: ["battles", battleId, isPublic ? "public" : "private"],
    queryFn: async () => {
      const response = await battlelogApiClient.get<GetBattleResponse>(
        endpoint,
        {
          suppressRouteErrorToast,
        } as ApiRequestConfig,
      );
      return response.data;
    },
    enabled: !!battleId,
  });
};

export const useBattle = (options: UseBattleOptions) => {
  useBattleLogApiClient();

  return useQuery(battleQueryOptions(options));
};
