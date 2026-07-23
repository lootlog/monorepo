import { createFileRoute } from "@tanstack/react-router";
import { BattlePanelLayout } from "@/features/user/battle-panel/battle-panel-layout/battle-panel-layout";
import { getBattlesControllerGetUserCharactersQueryOptions } from "@lootlog/api-client/react-query/battlelog/battles";
import { withRouteLoaderCancellation } from "@/lib/router/route-errors";
import { prefetchRouteQuery } from "@/lib/router/route-prefetch";

export const Route = createFileRoute("/_authenticated/@me/battle-panel")({
  loader: ({ abortController, context }) =>
    withRouteLoaderCancellation(abortController, async () => {
      void prefetchRouteQuery(
        context.queryClient,
        getBattlesControllerGetUserCharactersQueryOptions(),
      );

      return null;
    }),
  component: BattlePanelLayout,
});
