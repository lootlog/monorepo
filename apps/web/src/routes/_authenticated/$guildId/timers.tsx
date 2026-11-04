import { createFileRoute } from "@tanstack/react-router";
import { Timers } from "@/features/guild/timers/timers";
import { TimersPageSkeleton } from "@/features/guild/timers/timers-page-skeleton";

export const Route = createFileRoute("/_authenticated/$guildId/timers")({
  staticData: {
    navigation: ({ t }) => ({ label: t("common.breadcrumbs.timers") }),
  },
  component: Timers,
  pendingComponent: TimersPageSkeleton,
});
