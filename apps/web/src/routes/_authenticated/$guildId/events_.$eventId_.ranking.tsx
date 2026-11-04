import { createFileRoute } from "@tanstack/react-router";
import { EventRankingPage } from "@/features/guild/events/event-ranking-page";
import { EventRankingSkeleton } from "@/features/guild/events/event-ranking-skeleton";

export const Route = createFileRoute(
  "/_authenticated/$guildId/events_/$eventId_/ranking",
)({
  staticData: {
    navigation: ({ t }) => ({ label: t("common.breadcrumbs.ranking") }),
  },
  component: EventRankingPage,
  pendingComponent: EventRankingSkeleton,
});
