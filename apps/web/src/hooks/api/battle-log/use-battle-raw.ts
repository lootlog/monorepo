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
  events: RawBattleParsedEvent[];
  world: string;
};

export type GetBattleRawResponse = {
  battleId: string;
  rawData: RawBattle;
  timestamp: string;
};

export type UseBattleRawOptions = {
  battleId?: string;
  isPublic?: boolean;
};

export const useBattleRaw = (options: UseBattleRawOptions) => {
  const { client } = useBattleLogApiClient();

  const endpoint = options.isPublic
    ? `/battles/public/${options.battleId}/raw`
    : `/battles/${options.battleId}/raw`;

  const query = useQuery({
    queryKey: ["battles", "raw", options.battleId, options.isPublic ? "public" : "private"],
    queryFn: () => client.get<GetBattleRawResponse>(endpoint),
    enabled: !!options.battleId,
    select: (response) => response.data,
  });

  return query;
};
