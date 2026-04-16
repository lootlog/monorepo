import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/features/public-api/query-keys";
import { fetchTimers, type Timer } from "@/api";

type UseTimersOptions = {
  world?: string;
};

export type { Timer } from "@/api";

export const useTimers = ({ world }: UseTimersOptions) => {
  const query = useQuery({
    queryKey: queryKeys.timers(world),
    enabled: !!world,
    staleTime: 0,
    refetchOnWindowFocus: true,
    queryFn: () => fetchTimers(world as string),
  });

  return query;
};
