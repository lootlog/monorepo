import { createFileRoute } from "@tanstack/react-router";
import { BattlePanelLayout } from "@/features/battle-panel/battle-panel-layout/battle-panel-layout";
import { battleCharactersQueryOptions } from "@/hooks/api/battle-log/use-battle-characters";

export const Route = createFileRoute("/_authenticated/@me/battle-panel")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      battleCharactersQueryOptions({
        suppressRouteErrorToast: true,
      }),
    );

    return null;
  },
  component: BattlePanelLayout,
});
