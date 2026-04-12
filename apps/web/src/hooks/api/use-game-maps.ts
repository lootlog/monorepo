import { useApiClient } from "@/hooks/api/use-api-client";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

interface GameMap {
  id: number;
  name: string;
}

export const useGameMaps = () => {
  const { client } = useApiClient();

  return useQuery<GameMap[]>({
    queryKey: queryKeys.gameData.gameMaps(),
    queryFn: () => client.get<GameMap[]>("/maps"),
    staleTime: 1000 * 60 * 60, // 1 hour (matches backend cache)
  });
};

export type { GameMap };
