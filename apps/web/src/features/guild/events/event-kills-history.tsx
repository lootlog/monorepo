import { useParams } from "@tanstack/react-router";
import { EventKillsHistoryContent } from "./event-kills-history-content";

export const EventKillsHistory = () => {
  const {
    guildId,
    eventId,
    heroId: initialHeroId,
  } = useParams({
    strict: false,
  });

  return (
    <EventKillsHistoryContent
      key={initialHeroId ?? "all"}
      guildId={guildId}
      eventId={eventId}
      initialHeroId={initialHeroId}
    />
  );
};
