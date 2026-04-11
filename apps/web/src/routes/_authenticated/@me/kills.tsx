import { createFileRoute } from "@tanstack/react-router";
import { KillsPage } from "@/features/user/kills/kills";
import { KillsPageSkeleton } from "@/features/user/kills/kills-page-skeleton";

export const Route = createFileRoute("/_authenticated/@me/kills")({
  component: KillsPage,
  pendingComponent: KillsPageSkeleton,
});
