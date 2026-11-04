import { createFileRoute } from "@tanstack/react-router";
import { EventMemberKillsPage } from "@/features/guild/events/event-member-kills-page";
import { EventMemberSkeleton } from "@/features/guild/events/event-member-skeleton";
import { getNavigationEvent } from "@/features/guild/events/event-route-navigation";

export const Route = createFileRoute(
  "/_authenticated/$guildId/events_/$eventId_/members_/$memberId",
)({
  staticData: {
    navigation: ({ t, match, parentPath, matches }) => {
      const { memberId } = match.params ?? {};

      const ranking = getNavigationEvent(matches).rankings?.find(
        (entry) => String(entry.memberId) === memberId,
      );

      return {
        ancestors: [
          {
            label: t("common.breadcrumbs.ranking"),
            path: `${parentPath}/ranking`,
          },
        ],
        label:
          ranking?.member?.name ??
          t("common.breadcrumbs.memberFallback", { id: memberId }),
      };
    },
  },
  component: EventMemberKillsPage,
  pendingComponent: EventMemberSkeleton,
});
