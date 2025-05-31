import { useQuery } from "@tanstack/react-query";
import { API_URL } from "config/api";
import { useApiClient } from "hooks/api/use-api-client";
import { useGuildId } from "hooks/use-guild-id";

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
};

export const useGuildPlayers = ({ search }: UseGuildPlayersOptions) => {
  const { client, isAuthenticated } = useApiClient();
  const guildId = useGuildId();

  const queryParams = {
    search: search ?? "",
  };

  const query = useQuery({
    queryKey: ["guild-players", guildId, search],
    queryFn: () =>
      client.get<Player[]>(
        `${API_URL}/guilds/${guildId}/players?${new URLSearchParams(
          queryParams
        ).toString()}`
      ),
    enabled: isAuthenticated && !!guildId,
    select: (response) => response.data,
  });

  return query;
};
