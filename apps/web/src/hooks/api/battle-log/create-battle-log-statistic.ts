import { queryOptions, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  battlelogApiClient,
  type ApiRequestConfig,
} from "@/lib/api-client/api-client";

type CreateBattleLogStatisticOptions<TParams> = {
  queryKey: string;
  endpoint: string;
  params: TParams;
};

export function battleLogStatisticQueryOptions<TData, TParams>({
  queryKey,
  endpoint,
  params,
}: CreateBattleLogStatisticOptions<TParams>) {
  const requestParams =
    params && typeof params === "object"
      ? { ...(params as Record<string, unknown>) }
      : undefined;

  return queryOptions({
    queryKey: queryKeys.battleLog.statistic(queryKey, requestParams),
    queryFn: async () => {
      const response = await battlelogApiClient.get<TData[]>(endpoint, {
        params: requestParams,
      } as ApiRequestConfig);
      return response;
    },
    staleTime: 0,
  });
}

export function createBattleLogStatistic<TData, TParams>(
  queryKey: string,
  endpoint: string,
) {
  return function useBattleLogStatistic(params: TParams) {
    return useQuery(
      battleLogStatisticQueryOptions<TData, TParams>({
        queryKey,
        endpoint,
        params,
      }),
    );
  };
}
