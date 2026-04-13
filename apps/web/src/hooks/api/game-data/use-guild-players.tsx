import { useQuery } from "@tanstack/react-query";
import { SEARCH_API_URL } from "@/config/api";
import { useApiClient } from "@/hooks/api/use-api-client";
import { queryKeys } from "@/lib/query-keys";

export type Player = {
  id: string;
  accountId: number;
  guildId: string;
  name: string;
  lvl: number;
  prof: string;
  icon: string;
};

export type UseGuildPlayersOptions = {
  search?: string;
  selectedPlayers?: string;
  world?: string;
};

export const useGuildPlayers = ({
  search,
  selectedPlayers,
  world,
}: UseGuildPlayersOptions) => {
  const { client } = useApiClient();

  const queryParams = {
    search: search || selectedPlayers || "",
    ...(world ? { world } : {}),
  };

  const query = useQuery({
    queryKey: queryKeys.gameData.guildPlayers(search, selectedPlayers),
    queryFn: () =>
      client.get<Player[]>(
        `${SEARCH_API_URL}/players?${new URLSearchParams(
          queryParams,
        ).toString()}`,
      ),
  });

  return query;
};
