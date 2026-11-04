import { createFileRoute } from "@tanstack/react-router";
import { KillsPage } from "@/features/user/kills/kills";
import { KillsPageSkeleton } from "@/features/user/kills/kills-page-skeleton";
import { ROUTES } from "@/config/routes";

export const Route = createFileRoute("/_authenticated/@me/kills")({
  staticData: {
    navigation: ({ t }) => ({
      ancestors: [
        {
          label: t("layout.navigation.dashboard"),
          path: ROUTES.user.dashboard,
        },
      ],
      label: t("layout.breadcrumbs.npcRanking"),
    }),
  },
  component: KillsPage,
  pendingComponent: KillsPageSkeleton,
});
