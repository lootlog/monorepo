import { useParams } from "@tanstack/react-router";
import { EventMemberKillsPageContent } from "./event-member-kills-page-content";

export const EventMemberKillsPage = () => {
  const {
    guildId,
    eventId,
    memberId,
    heroId: initialHeroId,
  } = useParams({ strict: false });

  return (
    <EventMemberKillsPageContent
      key={initialHeroId ?? "all"}
      guildId={guildId}
      eventId={eventId}
      memberId={memberId}
      initialHeroId={initialHeroId}
    />
  );
};
