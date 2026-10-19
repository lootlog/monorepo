import { createFileRoute, redirect } from "@tanstack/react-router";
import { AbyssSeasonsPage } from "@/features/user/battle-panel/battle-panel-abyss/abyss-seasons-page";
import { AbyssSeasonsPageSkeleton } from "@/features/user/battle-panel/battle-panel-abyss/abyss-seasons-page-skeleton";
import { ensureBattlePanelCharacterId } from "@/features/user/battle-panel/battle-panel-route-loader";
import {
  battlePanelAbyssSearchSchema,
  loadBattlePanelAbyssSearch,
  normalizeBattlePanelCharacterId,
} from "@/features/user/battle-panel/battle-panel-search";
import { getBattlesControllerGetAbyssSeasonsQueryOptions } from "@lootlog/client/battlelog";
import { withRouteLoaderCancellation } from "@/lib/router/route-errors";
import { ensureRouteQueryData } from "@/lib/router/route-prefetch";

export const Route = createFileRoute("/_authenticated/@me/battle-panel/abyss")({
  validateSearch: battlePanelAbyssSearchSchema,
  loader: ({ abortController, context, location, preload }) =>
    withRouteLoaderCancellation(abortController, async () => {
      if (preload) {
        return null;
      }

      const search = loadBattlePanelAbyssSearch(location.searchStr);

      const characterId = await ensureBattlePanelCharacterId({
        queryClient: context.queryClient,
        characterId: normalizeBattlePanelCharacterId(search.characterId),
      });

      if (!characterId) {
        return null;
      }

      if (!search.characterId) {
        throw redirect({
          to: "/@me/battle-panel/abyss",
          search: { characterId },
        });
      }

      await ensureRouteQueryData(
        context.queryClient,
        getBattlesControllerGetAbyssSeasonsQueryOptions({ characterId }),
      );

      return null;
    }),
  component: AbyssSeasonsPage,
  pendingComponent: AbyssSeasonsPageSkeleton,
});
