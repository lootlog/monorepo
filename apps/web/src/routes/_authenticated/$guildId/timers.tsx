import { createFileRoute } from "@tanstack/react-router";
import { TimersPageSkeleton } from "@/features/timers/timers-page-skeleton";

export const Route = createFileRoute("/_authenticated/$guildId/timers")({
  pendingComponent: TimersPageSkeleton,
});
