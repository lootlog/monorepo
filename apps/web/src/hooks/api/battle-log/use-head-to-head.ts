import { useQuery } from "@tanstack/react-query";
import { useBattleLogApiClient } from "@/hooks/api/battle-log/use-battle-log-api-client";

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
}

export interface GetHeadToHeadResponse {
  records: HeadToHeadRecord[];
  pagination: {
    size: number;
    hasNext: boolean;
    hasPrev: boolean;
    nextCursor?: string;
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
  sortBy?: "wins" | "losses" | "totalBattles" | "winRate" | "lastBattleDate";
  sortOrder?: "asc" | "desc";
  includeTotal?: boolean;
  characterId?: string;
  world?: string;
  period?: string;
  search?: string;
  minBattles?: number;
  minLevel?: number;
  maxLevel?: number;
}

export function useHeadToHead(params?: UseHeadToHeadParams) {
  const { client } = useBattleLogApiClient();
  const size = params?.size ?? 20;
  const sortBy = params?.sortBy ?? "totalBattles";
  const sortOrder = params?.sortOrder ?? "desc";

  const query = useQuery({
    queryKey: ["head-to-head", params],
    queryFn: () => {
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
      if (params?.minBattles)
        searchParams.append("minBattles", params.minBattles.toString());
      if (params?.minLevel)
        searchParams.append("minLevel", params.minLevel.toString());
      if (params?.maxLevel)
        searchParams.append("maxLevel", params.maxLevel.toString());

      return client.get<GetHeadToHeadResponse>(
        `/battles/@me/statistics/head-to-head?${searchParams.toString()}`,
      );
    },
    select: (response) => response.data,
    staleTime: 0,
  });

  return query;
}
