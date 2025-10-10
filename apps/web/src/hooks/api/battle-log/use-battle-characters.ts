import { useQuery } from "@tanstack/react-query";
import { useBattleLogApiClient } from "@/hooks/api/battle-log/use-battle-log-api-client";

export type BattleCharacter = {
  id: string;
  name: string;
  world: string;
  icon: string;
};

export type GetBattleCharactersResponse = {
  characters: BattleCharacter[];
};

export const useBattleCharacters = () => {
  const { client } = useBattleLogApiClient();

  const query = useQuery({
    queryKey: ["battle-characters", "@me"],
    queryFn: () => {
      return client.get<GetBattleCharactersResponse>(`/battles/@me/characters`);
    },
    select: (response) => response.data.characters,
  });

  return query;
};
