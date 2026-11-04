import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/features/user/dashboard/dashboard";
import { DashboardPageSkeleton } from "@/features/user/dashboard/dashboard-page-skeleton";

export const Route = createFileRoute("/_authenticated/@me/")({
  staticData: {
    navigation: ({ t }) => ({ label: t("layout.navigation.dashboard") }),
  },
  component: Dashboard,
  pendingComponent: DashboardPageSkeleton,
});
