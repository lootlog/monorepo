import { redirect } from "@tanstack/react-router";
import {
  loadBattlePanelStatisticsSearch,
  normalizeBattlePanelCharacterId,
} from "@/features/user/battle-panel/battle-panel-search";
import {
  getBattlesControllerGetBattleDurationQueryOptions,
  getBattlesControllerGetCombatProfileQueryOptions,
  getBattlesControllerGetCurrentStreakQueryOptions,
  getBattlesControllerGetHeadToHeadQueryOptions,
  getBattlesControllerGetPhGrowthQueryOptions,
  getBattlesControllerGetProfessionWinRateQueryOptions,
  getBattlesControllerGetRatingGrowthQueryOptions,
  getBattlesControllerGetUserCharactersQueryOptions,
} from "@lootlog/client/battlelog";
import { withRouteLoaderCancellation } from "@/lib/router/route-errors";
import { prefetchRouteQuery } from "@/lib/router/route-prefetch";
import { LEADERBOARD_SIZE } from "@/components/common/stats-leaderboard-section";
import type { BattleAnalyticsParams } from "./battle-panel-statistics/components/battle-analytics-overview";

import type { QueryClient } from "@tanstack/react-query";

type EnsureBattlePanelCharacterIdOptions = {
  queryClient: QueryClient;
  characterId?: string;
};

export const ensureBattlePanelCharacterId = async ({
  queryClient,
  characterId,
}: EnsureBattlePanelCharacterIdOptions) => {
  if (characterId) {
    return characterId;
  }

  const charactersResponse = await queryClient.ensureQueryData(
    getBattlesControllerGetUserCharactersQueryOptions(),
  );

  return characterId ?? charactersResponse.characters[0]?.id;
};

/** Starts every query of `BattleAnalyticsOverview` for the same battles. */
export const prefetchBattleAnalytics = (
  queryClient: QueryClient,
  params: BattleAnalyticsParams,
) =>
  Promise.all([
    prefetchRouteQuery(
      queryClient,
      getBattlesControllerGetCombatProfileQueryOptions(params),
    ),
    prefetchRouteQuery(
      queryClient,
      getBattlesControllerGetCurrentStreakQueryOptions(params),
    ),
    prefetchRouteQuery(
      queryClient,
      getBattlesControllerGetBattleDurationQueryOptions(params),
    ),
    prefetchRouteQuery(
      queryClient,
      getBattlesControllerGetHeadToHeadQueryOptions({
        ...params,
        size: LEADERBOARD_SIZE,
      }),
    ),
    prefetchRouteQuery(
      queryClient,
      getBattlesControllerGetProfessionWinRateQueryOptions(params),
    ),
    params.matchmaking
      ? prefetchRouteQuery(
          queryClient,
          getBattlesControllerGetRatingGrowthQueryOptions(params),
        )
      : prefetchRouteQuery(
          queryClient,
          getBattlesControllerGetPhGrowthQueryOptions(params),
        ),
  ]).catch(() => undefined);

export const loadBattlePanelStatistics = ({
  abortController,
  context,
  location,
  preload,
}: {
  abortController: AbortController;
  context: { queryClient: QueryClient };
  location: { searchStr: string };
  preload: boolean;
}) =>
  withRouteLoaderCancellation(abortController, async () => {
    if (preload) {
      return null;
    }

    const search = loadBattlePanelStatisticsSearch(location.searchStr);

    const normalizedCharacterId = normalizeBattlePanelCharacterId(
      search.characterId,
    );

    const characterId = await ensureBattlePanelCharacterId({
      queryClient: context.queryClient,
      characterId: normalizedCharacterId,
    });

    if (!characterId) {
      return null;
    }

    if (!search.characterId) {
      throw redirect({
        to: "/@me/battle-panel/statistics",
        search: {
          ...search,
          characterId,
        },
      });
    }

    void prefetchBattleAnalytics(context.queryClient, {
      characterId,
      period: search.period,
      minLevel: search.minLevel,
      maxLevel: search.maxLevel,
      startDate: search.startDate ?? undefined,
      endDate: search.endDate ?? undefined,
      ph: search.ph ?? undefined,
      matchmaking: false,
    });

    return null;
  });
