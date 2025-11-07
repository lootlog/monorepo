import { useQuery } from "@tanstack/react-query";
import { useBattleLogApiClient } from "@/hooks/api/battle-log/use-battle-log-api-client";

export const useBattleWorlds = () => {
  const { client } = useBattleLogApiClient();

  const query = useQuery({
    queryKey: ["battle-worlds", "@me"],
    queryFn: () => client.get<{ worlds: string[] }>("/battles/@me/worlds"),
    select: (response) => response.data,
    staleTime: 1000 * 60 * 5,
  });

  return query;
};
