import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/features/public-api/query-keys";
import { fetchTimers } from "@/api";

type UseTimersOptions = {
  world?: string;
};

export const useTimers = ({ world }: UseTimersOptions) => {
  const query = useQuery({
    queryKey: queryKeys.timers(world),
    enabled: !!world,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    queryFn: () => fetchTimers(world as string),
  });

  return query;
};
