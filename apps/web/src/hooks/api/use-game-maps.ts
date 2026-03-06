import { useApiClient } from "@/hooks/api/use-api-client";
import { useQuery } from "@tanstack/react-query";

interface GameMap {
  id: number;
  name: string;
}

export const useGameMaps = () => {
  const { client } = useApiClient();

  return useQuery<GameMap[]>({
    queryKey: ["game-maps"],
    queryFn: async () => {
      const response = await client.get<GameMap[]>("/maps");
      return response.data;
    },
    staleTime: 1000 * 60 * 60, // 1 hour (matches backend cache)
  });
};

export type { GameMap };
