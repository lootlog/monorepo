import { createFileRoute } from "@tanstack/react-router";
import { KillDetail } from "@/features/guild/events/kill-detail";
import { EventKillDetailSkeleton } from "@/features/guild/events/event-kill-detail-skeleton";
import { getEventHeroBreadcrumb } from "@/features/guild/events/event-route-navigation";

export const Route = createFileRoute(
  "/_authenticated/$guildId/events_/$eventId_/heroes_/$heroId_/kills_/$killId",
)({
  staticData: {
    navigation: (context) => ({
      ancestors: [getEventHeroBreadcrumb(context)],
      label: context.t("events.killDetail.title"),
    }),
  },
  component: KillDetail,
  pendingComponent: EventKillDetailSkeleton,
});
