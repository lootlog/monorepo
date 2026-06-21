import { createFileRoute } from "@tanstack/react-router";
import { BattlePanelSingleBattle } from "@/features/user/battle-panel/battle-panel-single-battle/battle-panel-single-battle";
import { BattlePanelSingleBattleSkeleton } from "@/features/user/battle-panel/battle-panel-single-battle/battle-panel-single-battle-skeleton";
import { battlePanelSingleBattleSearchSchema } from "@/features/user/battle-panel/battle-panel-search";
import {
  getBattlesControllerGetBattleQueryOptions,
  getBattlesControllerGetBattleRawDataQueryOptions,
} from "@/lib/api/generated/battlelog/battles/battles";
import {
  throwNotFoundIfResponseMatches,
  withRouteLoaderCancellation,
} from "@/lib/router/route-errors";

export const Route = createFileRoute(
  "/_authenticated/@me/battle-panel/battles_/$battleId",
)({
  validateSearch: battlePanelSingleBattleSearchSchema,
  loader: ({ abortController, context, params, preload }) =>
    withRouteLoaderCancellation(abortController, async () => {
      if (preload) {
        return null;
      }

      try {
        const [battle] = await Promise.all([
          context.queryClient.ensureQueryData(
            getBattlesControllerGetBattleQueryOptions({
              battleId: params.battleId,
            }),
          ),
          context.queryClient.ensureQueryData(
            getBattlesControllerGetBattleRawDataQueryOptions({
              battleId: params.battleId,
            }),
          ),
        ]);

        return { battle };
      } catch (error) {
        throwNotFoundIfResponseMatches(error);
      }
    }),
  component: BattlePanelSingleBattle,
  pendingComponent: BattlePanelSingleBattleSkeleton,
});
