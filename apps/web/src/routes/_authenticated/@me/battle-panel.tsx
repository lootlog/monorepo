import { createFileRoute } from "@tanstack/react-router";
import { BattlePanelLayout } from "@/features/user/battle-panel/battle-panel-layout/battle-panel-layout";
import { getBattlesControllerGetUserCharactersQueryOptions } from "@/lib/api/generated/battlelog/battles/battles";

export const Route = createFileRoute("/_authenticated/@me/battle-panel")({
  loader: async ({ context, preload }) => {
    if (preload) {
      return null;
    }

    await context.queryClient.ensureQueryData(
      getBattlesControllerGetUserCharactersQueryOptions(),
    );

    return null;
  },
  component: BattlePanelLayout,
});
