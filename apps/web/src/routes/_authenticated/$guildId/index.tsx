import { createFileRoute } from "@tanstack/react-router";
import { LootsListPage } from "@/features/guild/loots-list/loots-list";
import { LootsListPageSkeleton } from "@/features/guild/loots-list/loots-list-page-skeleton";

export const Route = createFileRoute("/_authenticated/$guildId/")({
  component: LootsListPage,
  pendingComponent: LootsListPageSkeleton,
});
