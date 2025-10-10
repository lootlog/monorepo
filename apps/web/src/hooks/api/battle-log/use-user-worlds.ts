import { useQuery } from "@tanstack/react-query";
import { useBattleLogApiClient } from "@/hooks/api/battle-log/use-battle-log-api-client";

export type GetUserWorldsResponse = {
  worlds: string[];
};

export const useUserWorlds = () => {
  const { client } = useBattleLogApiClient();

  const query = useQuery({
    queryKey: ["user-worlds", "@me"],
    queryFn: () => {
      return client.get<GetUserWorldsResponse>(`/battles/@me/worlds`);
    },
    select: (response) => response.data.worlds,
  });

  return query;
};
