import { useQuery } from "@tanstack/react-query";
import { API_URL } from "@/config/api";
import { useAuthenticatedApiClient } from "@/hooks/api/use-api-client";
import { useGlobalStore } from "@/store/global.store";

export type UseLootlogCharactersConfigOptions = {
  //   accountId?: string;
};

export type LootlogCharacterConfig = {
  userId: string;
  accountId: string;
  characterId: string;
  collectLootBlaclistGuildIds: string[];
  addTimersBlacklistGuildIds: string[];
};

export type LootlogCharacterConfigResponse = Record<
  string,
  LootlogCharacterConfig
>;

export const useLootlogCharactersConfig = () => {
  const accountId = useGlobalStore((state) => state.gameState.accountId);
  const { client } = useAuthenticatedApiClient();

  const query = useQuery({
    queryKey: ["lootlog-characters-config", accountId],
    queryFn: () =>
      client.get<LootlogCharacterConfigResponse>(
        `${API_URL}/users/@me/lootlog-config/accounts/${accountId}`,
        { withCredentials: true }
      ),
    select: (response) => response.data,
    enabled: !!accountId,
    refetchOnMount: false,
  });

  return query;
};
