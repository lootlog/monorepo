import { createFileRoute } from "@tanstack/react-router";
import { AbyssHub } from "@/features/user/battle-panel/battle-panel-abyss/abyss-hub";
import { BattlePanelStatisticsSkeleton } from "@/features/user/battle-panel/battle-panel-statistics/battle-panel-statistics-skeleton";
import { ensureBattlePanelCharacterId } from "@/features/user/battle-panel/battle-panel-route-loader";
import {
  battlePanelAbyssSearchSchema,
  loadBattlePanelAbyssSearch,
  normalizeBattlePanelCharacterId,
} from "@/features/user/battle-panel/battle-panel-search";
import {
  getBattlesControllerGetAbyssSeasonsQueryOptions,
  getBattlesControllerGetBattleDurationQueryOptions,
  getBattlesControllerGetCombatProfileQueryOptions,
  getBattlesControllerGetCurrentStreakQueryOptions,
  getBattlesControllerGetDashboardBattlesQueryOptions,
  getBattlesControllerGetProfessionWinRateQueryOptions,
  getBattlesControllerGetRatingDeltaByOpponentQueryOptions,
  getBattlesControllerGetRatingGrowthQueryOptions,
} from "@lootlog/client/battlelog";
import { withRouteLoaderCancellation } from "@/lib/router/route-errors";
import {
  ensureRouteQueryData,
  prefetchRouteQuery,
} from "@/lib/router/route-prefetch";

export const Route = createFileRoute("/_authenticated/@me/battle-panel/abyss")({
  validateSearch: battlePanelAbyssSearchSchema,
  loader: ({ abortController, context, location }) =>
    withRouteLoaderCancellation(abortController, async () => {
      const search = loadBattlePanelAbyssSearch(location.searchStr);
      const characterId = await ensureBattlePanelCharacterId({
        queryClient: context.queryClient,
        characterId: normalizeBattlePanelCharacterId(search.characterId),
      });

      if (!characterId) {
        return null;
      }

      const seasons = await ensureRouteQueryData(
        context.queryClient,
        getBattlesControllerGetAbyssSeasonsQueryOptions({ characterId }),
      );
      const selectedSeason =
        seasons.find((season) => season.id === search.seasonId) ?? seasons[0];
      const startDate = search.startDate ?? selectedSeason?.startedAt;
      const endDate = search.endDate ?? selectedSeason?.endedAt;
      const baseParams = {
        characterId,
        period: "all" as const,
        minLevel: search.minLevel,
        maxLevel: search.maxLevel,
        startDate,
        endDate,
        matchmaking: true,
      };

      if (search.tab === "analytics") {
        void Promise.all([
          prefetchRouteQuery(
            context.queryClient,
            getBattlesControllerGetCombatProfileQueryOptions(baseParams),
          ),
          prefetchRouteQuery(
            context.queryClient,
            getBattlesControllerGetProfessionWinRateQueryOptions(baseParams),
          ),
          prefetchRouteQuery(
            context.queryClient,
            getBattlesControllerGetCurrentStreakQueryOptions(baseParams),
          ),
          prefetchRouteQuery(
            context.queryClient,
            getBattlesControllerGetBattleDurationQueryOptions(baseParams),
          ),
          prefetchRouteQuery(
            context.queryClient,
            getBattlesControllerGetRatingGrowthQueryOptions(baseParams),
          ),
          prefetchRouteQuery(
            context.queryClient,
            getBattlesControllerGetRatingDeltaByOpponentQueryOptions(
              baseParams,
            ),
          ),
        ]).catch(() => undefined);
      }

      if (search.tab === "battles") {
        void prefetchRouteQuery(
          context.queryClient,
          getBattlesControllerGetDashboardBattlesQueryOptions({
            cursor: search.cursor ?? undefined,
            size: 20,
            includeTotal: true,
            matchmaking: true,
            characterId: [characterId],
            startDate,
            endDate,
            minLevel: search.minLevel,
            maxLevel: search.maxLevel,
          }),
        ).catch(() => undefined);
      }

      return null;
    }),
  component: AbyssHub,
  pendingComponent: BattlePanelStatisticsSkeleton,
});
