import { useQuery } from "@tanstack/react-query";
import { API_URL } from "@/config/api";
import { useAuthenticatedApiClient } from "@/hooks/api/use-api-client";
import { Game } from "@/lib/game";

export type UseLootlogCharactersConfigOptions = {
  //   accountId?: string;
};

export type LootlogCharacterConfig = {
  userId: string;
  accountId: string;
  characterId: string;
  collectLootWhitelistGuildIds: string[];
  addTimersWhitelistGuildIds: string[];
};

export type LootlogCharacterConfigResponse = Record<
  string,
  LootlogCharacterConfig
>;

export const useLootlogCharactersConfig = () => {
  const { client } = useAuthenticatedApiClient();
  const accountId = String(Game.hero.account);

  const query = useQuery({
    queryKey: ["lootlog-characters-config", accountId],
    queryFn: () => {
      return client.get<LootlogCharacterConfigResponse>(
        `${API_URL}/users/@me/lootlog-config/accounts/${accountId}`,
        { withCredentials: true },
      );
    },
    select: (response) => response.data,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  return query;
};
