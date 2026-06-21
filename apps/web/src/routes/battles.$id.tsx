import { createFileRoute } from "@tanstack/react-router";
import { PublicBattle } from "@/features/public-battle/public-battle";
import { PublicBattleSkeleton } from "@/features/public-battle/public-battle-skeleton";
import { battlePanelSingleBattleSearchSchema } from "@/features/user/battle-panel/battle-panel-search";
import {
  getPublicBattlesControllerGetPublicBattleQueryOptions,
  getPublicBattlesControllerGetPublicBattleRawQueryOptions,
  getPublicBattlesControllerGetPublicBattleTimelineQueryOptions,
} from "@/lib/api/generated/battlelog/public-battles/public-battles";
import {
  throwNotFoundIfResponseMatches,
  withRouteLoaderCancellation,
} from "@/lib/router/route-errors";

export const Route = createFileRoute("/battles/$id")({
  validateSearch: battlePanelSingleBattleSearchSchema,
  loader: ({ abortController, context, params }) =>
    withRouteLoaderCancellation(abortController, async () => {
      try {
        await Promise.all([
          context.queryClient.ensureQueryData(
            getPublicBattlesControllerGetPublicBattleQueryOptions({
              battleId: params.id,
            }),
          ),
          context.queryClient.ensureQueryData(
            getPublicBattlesControllerGetPublicBattleRawQueryOptions({
              battleId: params.id,
            }),
          ),
        ]);
        void context.queryClient.prefetchQuery(
          getPublicBattlesControllerGetPublicBattleTimelineQueryOptions({
            battleId: params.id,
          }),
        );

        return null;
      } catch (error) {
        throwNotFoundIfResponseMatches(error);
      }
    }),
  component: PublicBattle,
  pendingComponent: PublicBattleSkeleton,
});
