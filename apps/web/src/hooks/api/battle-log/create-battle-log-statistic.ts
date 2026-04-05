import { useQuery } from "@tanstack/react-query";
import { battlelogApiClient } from "@/lib/api-client/api-client";

export function createBattleLogStatistic<TData, TParams>(
  queryKey: string,
  endpoint: string,
) {
  return function useBattleLogStatistic(params: TParams) {
    return useQuery({
      queryKey: [queryKey, params],
      queryFn: async () => {
        const response = await battlelogApiClient.get(endpoint, {
          params,
        });
        return response.data as TData[];
      },
      staleTime: 0,
    });
  };
}
