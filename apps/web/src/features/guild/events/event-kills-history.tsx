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
      // Only leaving a hero's page remounts; moving between heroes keeps the
      // focused tab.
      key={initialHeroId ? "hero" : "all"}
      guildId={guildId}
      eventId={eventId}
      initialHeroId={initialHeroId}
    />
  );
};
