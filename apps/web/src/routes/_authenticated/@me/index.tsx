import { createFileRoute, redirect } from "@tanstack/react-router";
import { Dashboard } from "@/features/user/dashboard/dashboard";
import { DashboardPageSkeleton } from "@/features/user/dashboard/dashboard-page-skeleton";
import { restoreLastOrganization } from "@/lib/router/restore-last-organization";

export const Route = createFileRoute("/_authenticated/@me/")({
  beforeLoad: async ({ context, preload, abortController }) => {
    if (preload || !context.isInitialNavigation) return;

    const userId = context.session.data?.user.id;

    if (!userId) return;

    const guildId = await restoreLastOrganization({
      queryClient: context.queryClient,
      userId,
      abortController,
    });

    if (guildId) {
      throw redirect({
        to: "/$guildId",
        params: { guildId },
        replace: true,
      });
    }
  },
  component: Dashboard,
  pendingComponent: DashboardPageSkeleton,
});
