import { createFileRoute } from "@tanstack/react-router";
import { BattlePanelSingleBattle } from "@/features/user/battle-panel/battle-panel-single-battle/battle-panel-single-battle";
import { BattlePanelSingleBattleSkeleton } from "@/features/user/battle-panel/battle-panel-single-battle/battle-panel-single-battle-skeleton";
import { battleQueryOptions } from "@/hooks/api/battle-log/use-battle";
import { battleRawQueryOptions } from "@/hooks/api/battle-log/use-battle-raw";
import { throwNotFoundIfResponseMatches } from "@/lib/router/route-errors";

export const Route = createFileRoute(
  "/_authenticated/@me/battle-panel/battles_/$battleId",
)({
  loader: async ({ context, params }) => {
    try {
      await Promise.all([
        context.queryClient.ensureQueryData(
          battleQueryOptions({
            battleId: params.battleId,
          }),
        ),
        context.queryClient.ensureQueryData(
          battleRawQueryOptions({
            battleId: params.battleId,
          }),
        ),
      ]);

      return null;
    } catch (error) {
      throwNotFoundIfResponseMatches(error);
    }
  },
  component: BattlePanelSingleBattle,
  pendingComponent: BattlePanelSingleBattleSkeleton,
});
