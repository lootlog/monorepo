import { queryOptions, useQuery } from "@tanstack/react-query";
import { battlelogApiClient } from "@/lib/api-client/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface PlayerVsPlayerBattle {
  battleId: string;
  createdAt: string;
  duration: number;
  winner: string;
  loser: string;
  ratingDelta: number;
  userRating: number;
  opponentRating: number;
  userWarrior: {
    name: string;
    lvl: number;
    prof: string;
    icon: string;
  };
  opponentWarrior: {
    name: string;
    lvl: number;
    prof: string;
    icon: string;
  };
}

export interface GetPlayerVsPlayerResponse {
  battles: PlayerVsPlayerBattle[];
  pagination: {
    size: number;
    hasNext: boolean;
    hasPrev: boolean;
    nextCursor?: string;
    previousCursor?: string;
    total?: number;
  };
  meta: {
    performance: {
      queryTime: number;
      totalItems?: number;
    };
  };
}

export interface UsePlayerVsPlayerParams {
  cursor?: string;
  size?: number;
  includeTotal?: boolean;
  characterId?: string;
  world?: string;
  period?: string;
  opponentId: string;
  minLevel?: number;
  maxLevel?: number;
}

const buildPlayerVsPlayerSearchParams = (params: UsePlayerVsPlayerParams) => {
  const size = params.size ?? 20;

  const searchParams = new URLSearchParams({
    size: size.toString(),
    opponentId: params.opponentId,
  });

  if (params.cursor) searchParams.append("cursor", params.cursor);
  if (params.includeTotal) searchParams.append("includeTotal", "true");
  if (params.characterId)
    searchParams.append("characterId", params.characterId);
  if (params.world) searchParams.append("world", params.world);
  if (params.period) searchParams.append("period", params.period);
  if (params.minLevel) {
    searchParams.append("minLevel", params.minLevel.toString());
  }
  if (params.maxLevel) {
    searchParams.append("maxLevel", params.maxLevel.toString());
  }

  return searchParams;
};

export const playerVsPlayerQueryOptions = (params: UsePlayerVsPlayerParams) =>
  queryOptions({
    queryKey: queryKeys.battleLog.playerVsPlayer(params),
    queryFn: async () => {
      const searchParams = buildPlayerVsPlayerSearchParams(params);

      const response = await battlelogApiClient.get<GetPlayerVsPlayerResponse>(
        `/battles/@me/statistics/player-vs-player?${searchParams.toString()}`,
      );
      return response;
    },
    staleTime: 0,
    enabled: !!params.opponentId,
  });

export function usePlayerVsPlayer(params: UsePlayerVsPlayerParams) {
  return useQuery(playerVsPlayerQueryOptions(params));
}
