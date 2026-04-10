import { createFileRoute } from "@tanstack/react-router";
import { BattlePanelDashboard } from "@/features/battle-panel/battle-panel-dashboard/battle-panel-dashboard";
import { BattlePanelDashboardSkeleton } from "@/features/battle-panel/battle-panel-dashboard/battle-panel-dashboard-skeleton";
import { battleAnalyticsQueryOptions } from "@/hooks/api/battle-log/use-battle-analytics";

export const Route = createFileRoute("/_authenticated/@me/battle-panel/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      battleAnalyticsQueryOptions({
        period: "180d",
        suppressRouteErrorToast: true,
      }),
    );

    return null;
  },
  component: BattlePanelDashboard,
  pendingComponent: BattlePanelDashboardSkeleton,
});
