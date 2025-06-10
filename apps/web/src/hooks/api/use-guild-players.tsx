import { useQuery } from "@tanstack/react-query";
import { SEARCH_API_URL } from "@/config/api";
import { useApiClient } from "@/hooks/api/use-api-client";

export type Player = {
  id: number;
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
};

export const useGuildPlayers = ({
  search,
  selectedPlayers,
}: UseGuildPlayersOptions) => {
  const { client } = useApiClient();

  const queryParams = {
    search: search || selectedPlayers || "",
  };

  const query = useQuery({
    queryKey: ["guild-players", search, selectedPlayers],
    queryFn: () =>
      client.get<Player[]>(
        `${SEARCH_API_URL}/players?${new URLSearchParams(
          queryParams
        ).toString()}`
      ),
    select: (response) => response.data,
  });

  return query;
};
