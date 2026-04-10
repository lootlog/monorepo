import { queryOptions, useQuery } from "@tanstack/react-query";
import {
  battlelogApiClient,
  type ApiRequestConfig,
} from "@/lib/api-client/api-client";

type CreateBattleLogStatisticOptions<TParams> = {
  queryKey: string;
  endpoint: string;
  params: TParams;
  suppressRouteErrorToast?: boolean;
};

export function battleLogStatisticQueryOptions<TData, TParams>({
  queryKey,
  endpoint,
  params,
  suppressRouteErrorToast = false,
}: CreateBattleLogStatisticOptions<TParams>) {
  const requestParams =
    params && typeof params === "object"
      ? { ...(params as Record<string, unknown>) }
      : undefined;

  if (requestParams && "suppressRouteErrorToast" in requestParams) {
    delete requestParams.suppressRouteErrorToast;
  }

  return queryOptions({
    queryKey: [queryKey, requestParams],
    queryFn: async () => {
      const response = await battlelogApiClient.get(endpoint, {
        params: requestParams,
        suppressRouteErrorToast,
      } as ApiRequestConfig);
      return response.data as TData[];
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
