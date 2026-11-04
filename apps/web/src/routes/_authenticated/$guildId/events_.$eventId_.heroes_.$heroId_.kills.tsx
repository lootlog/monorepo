import { createFileRoute } from "@tanstack/react-router";
import { EventKillsHistory } from "@/features/guild/events/event-kills-history";
import { EventKillsSkeleton } from "@/features/guild/events/event-kills-skeleton";
import { getEventHeroBreadcrumb } from "@/features/guild/events/event-route-navigation";

export const Route = createFileRoute(
  "/_authenticated/$guildId/events_/$eventId_/heroes_/$heroId_/kills",
)({
  staticData: {
    navigation: (context) => ({
      ancestors: [getEventHeroBreadcrumb(context)],
      label: context.t("common.breadcrumbs.killHistory"),
    }),
  },
  component: EventKillsHistory,
  pendingComponent: EventKillsSkeleton,
});
