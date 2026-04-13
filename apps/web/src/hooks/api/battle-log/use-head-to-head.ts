import { queryOptions, useQuery } from "@tanstack/react-query";
import { useBattleLogApiClient } from "@/hooks/api/battle-log/use-battle-log-api-client";
import {
  battlelogApiClient,
  type ApiRequestConfig,
} from "@/lib/api-client/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface HeadToHeadRecord {
  opponentId: string;
  opponentName: string;
  opponentIcon: string;
  opponentProf: string;
  opponentLvl: number;
  wins: number;
  losses: number;
  totalBattles: number;
  winRate: number;
  lastBattleDate: string;
  totalRatingDelta?: number;
  avgRatingDelta?: number;
}

export interface GetHeadToHeadResponse {
  records: HeadToHeadRecord[];
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
      countTime?: number;
      totalItems?: number;
      estimatedTotal?: boolean;
    };
  };
}

export interface UseHeadToHeadParams {
  cursor?: string;
  size?: number;
  sortBy?:
    | "wins"
    | "losses"
    | "totalBattles"
    | "winRate"
    | "lastBattleDate"
    | "totalRatingDelta"
    | "avgRatingDelta";
  sortOrder?: "asc" | "desc";
  includeTotal?: boolean;
  characterId?: string;
  world?: string;
  period?: string;
  search?: string;
  minBattles?: number;
  minLevel?: number;
  maxLevel?: number;
  ph?: boolean;
  matchmaking?: boolean;
}

const buildHeadToHeadSearchParams = (params?: UseHeadToHeadParams) => {
  const size = params?.size ?? 20;
  const sortBy = params?.sortBy ?? "totalBattles";
  const sortOrder = params?.sortOrder ?? "desc";

  const searchParams = new URLSearchParams({
    size: size.toString(),
    sortBy,
    sortOrder,
  });

  if (params?.cursor) searchParams.append("cursor", params.cursor);
  if (params?.includeTotal) searchParams.append("includeTotal", "true");
  if (params?.characterId)
    searchParams.append("characterId", params.characterId);
  if (params?.world) searchParams.append("world", params.world);
  if (params?.period) searchParams.append("period", params.period);
  if (params?.search) searchParams.append("search", params.search);
  if (params?.minBattles) {
    searchParams.append("minBattles", params.minBattles.toString());
  }
  if (params?.minLevel) {
    searchParams.append("minLevel", params.minLevel.toString());
  }
  if (params?.maxLevel) {
    searchParams.append("maxLevel", params.maxLevel.toString());
  }
  if (params?.ph) searchParams.append("ph", "true");
  if (params?.matchmaking) searchParams.append("matchmaking", "true");

  return searchParams;
};

export const headToHeadQueryOptions = (params?: UseHeadToHeadParams) =>
  queryOptions({
    queryKey: queryKeys.battleLog.headToHead(params),
    queryFn: async () => {
      const searchParams = buildHeadToHeadSearchParams(params);

      const response = await battlelogApiClient.get<GetHeadToHeadResponse>(
        `/battles/@me/statistics/head-to-head?${searchParams.toString()}`,
        {} as ApiRequestConfig,
      );
      return response;
    },
    staleTime: 0,
  });

export function useHeadToHead(params?: UseHeadToHeadParams) {
  useBattleLogApiClient();

  return useQuery(headToHeadQueryOptions(params));
}
