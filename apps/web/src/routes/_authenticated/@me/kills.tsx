import { createFileRoute } from "@tanstack/react-router";
import { KillsPageSkeleton } from "@/features/kills/kills-page-skeleton";

export const Route = createFileRoute("/_authenticated/@me/kills")({
  pendingComponent: KillsPageSkeleton,
});
