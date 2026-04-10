import { createFileRoute } from "@tanstack/react-router";
import { KillsPage } from "@/features/kills/kills-page";
import { KillsPageSkeleton } from "@/features/kills/kills-page-skeleton";

export const Route = createFileRoute("/_authenticated/@me/kills")({
  component: KillsPage,
  pendingComponent: KillsPageSkeleton,
});
