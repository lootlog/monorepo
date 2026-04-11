import { useQuery } from "@tanstack/react-query";
import { useBattleLogApiClient } from "@/hooks/api/battle-log/use-battle-log-api-client";
import { queryKeys } from "@/lib/query-keys";

export type GetUserWorldsResponse = {
  worlds: string[];
};

export const useUserWorlds = () => {
  const { client } = useBattleLogApiClient();

  const query = useQuery({
    queryKey: queryKeys.battleLog.userWorlds(),
    queryFn: () => {
      return client.get<GetUserWorldsResponse>(`/battles/@me/worlds`);
    },
    select: (response) => response.worlds,
  });

  return query;
};
