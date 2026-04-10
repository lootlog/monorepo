import { createFileRoute } from "@tanstack/react-router";
import { Timers } from "@/features/timers/timers";
import { TimersPageSkeleton } from "@/features/timers/timers-page-skeleton";

export const Route = createFileRoute("/_authenticated/$guildId/timers")({
  component: Timers,
  pendingComponent: TimersPageSkeleton,
});
