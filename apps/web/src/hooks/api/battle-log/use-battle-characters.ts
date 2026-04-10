import { queryOptions, useQuery } from "@tanstack/react-query";
import { useBattleLogApiClient } from "@/hooks/api/battle-log/use-battle-log-api-client";
import { queryKeys } from "@/lib/query-keys";
import {
  battlelogApiClient,
  type ApiRequestConfig,
} from "@/lib/api-client/api-client";

export type BattleCharacter = {
  id: string;
  name: string;
  world: string;
  icon: string;
};

export type GetBattleCharactersResponse = {
  characters: BattleCharacter[];
};

type BattleCharactersQueryOptionsOptions = {
  suppressRouteErrorToast?: boolean;
};

export const battleCharactersQueryOptions = ({
  suppressRouteErrorToast = false,
}: BattleCharactersQueryOptionsOptions = {}) =>
  queryOptions({
    queryKey: queryKeys.battleLog.characters(),
    queryFn: async () => {
      const response =
        await battlelogApiClient.get<GetBattleCharactersResponse>(
          `/battles/@me/characters`,
          {
            suppressRouteErrorToast,
          } as ApiRequestConfig,
        );
      return response.characters;
    },
  });

export const useBattleCharacters = () => {
  useBattleLogApiClient();

  return useQuery(battleCharactersQueryOptions());
};
