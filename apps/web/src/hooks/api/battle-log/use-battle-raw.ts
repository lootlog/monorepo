import { useBattleLogApiClient } from "@/hooks/api/battle-log/use-battle-log-api-client";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  battlelogApiClient,
  type ApiRequestConfig,
} from "@/lib/api-client/api-client";

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

export const battleRawQueryOptions = ({
  battleId,
  isPublic = false,
}: UseBattleRawOptions) => {
  const endpoint = isPublic
    ? `/battles/public/${battleId}/raw`
    : `/battles/${battleId}/raw`;

  return queryOptions({
    queryKey: queryKeys.battleLog.battleRaw(battleId, isPublic),
    queryFn: async () => {
      const response = await battlelogApiClient.get<GetBattleRawResponse>(
        endpoint,
        {} as ApiRequestConfig,
      );
      return response;
    },
    enabled: !!battleId,
  });
};

export const useBattleRaw = (options: UseBattleRawOptions) => {
  useBattleLogApiClient();

  return useQuery(battleRawQueryOptions(options));
};
