import { createFileRoute } from "@tanstack/react-router";
import { BattlePanelLayout } from "@/features/user/battle-panel/battle-panel-layout/battle-panel-layout";
import { getBattlesControllerGetUserCharactersQueryOptions } from "@/lib/api/generated/battlelog/battles/battles";
import { withRouteLoaderCancellation } from "@/lib/router/route-errors";

export const Route = createFileRoute("/_authenticated/@me/battle-panel")({
  loader: ({ abortController, context, preload }) =>
    withRouteLoaderCancellation(abortController, async () => {
      if (preload) {
        return null;
      }

      await context.queryClient.ensureQueryData(
        getBattlesControllerGetUserCharactersQueryOptions(),
      );

      return null;
    }),
  component: BattlePanelLayout,
});
