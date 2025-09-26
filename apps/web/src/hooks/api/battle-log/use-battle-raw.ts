import { useBattleLogApiClient } from "@/hooks/api/battle-log/use-battle-log-api-client";
import { useQuery } from "@tanstack/react-query";

export type RawBattleParsedEventAction = {
  actionType: string;
  param: string;
};

export type RawBattleParsedEvent = {
  attackerId: string;
  defenderId: string;
  actions: RawBattleParsedEventAction[];
  attackerHpPercentage: number;
  defenderHpPercentage: number;
};

export type RawBattle = {
  accountId: string;
  characterId: string;
  parsedEvents: RawBattleParsedEvent[];
  world: string;
};

export type GetBattleRawResponse = {
  battleId: string;
  rawData: RawBattle;
  timestamp: string;
};

export type UseBattleRawOptions = {
  battleId?: string;
};

export const useBattleRaw = (options: UseBattleRawOptions) => {
  const { client } = useBattleLogApiClient();

  const query = useQuery({
    queryKey: ["battles", "raw", options.battleId],
    queryFn: () =>
      client.get<GetBattleRawResponse>(`/battles/${options.battleId}/raw`),
    enabled: !!options.battleId,
    select: (response) => response.data,
  });

  return query;
};
