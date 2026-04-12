import { queryOptions, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { battlelogApiClient } from "@/lib/api-client/api-client";

export type BattleCharacter = {
  id: string;
  name: string;
  world: string;
  icon: string;
};

export type GetBattleCharactersResponse = {
  characters: BattleCharacter[];
};

export const battleCharactersQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.battleLog.characters(),
    queryFn: async () => {
      const response =
        await battlelogApiClient.get<GetBattleCharactersResponse>(
          `/battles/@me/characters`,
        );
      return response.characters;
    },
  });

export const useBattleCharacters = () => {
  return useQuery(battleCharactersQueryOptions());
};
