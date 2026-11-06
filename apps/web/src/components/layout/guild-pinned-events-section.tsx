import { PinnedEventsBanner } from "./pinned-events-banner";
import { useListPinnedEvents } from "@lootlog/client/main";
import { CollapsePresence } from "@/components/common/collapse-presence";

export const GuildPinnedEventsSection = ({
  guildId,
  enabled,
  onNavigate,
}: {
  guildId: string;
  /** Collapses the section, so losing events access hides it smoothly. */
  enabled: boolean;
  onNavigate?: () => void;
}) => {
  const { data: pinnedEvents } = useListPinnedEvents(
    { guildId },
    {
      query: {
        enabled: enabled && Boolean(guildId),
      },
    },
  );

  const pinnedActiveEvents = pinnedEvents?.map(({ event }) => event) ?? [];
  const hasPinnedEvents = pinnedActiveEvents.length > 0;

  // The route loader brings the pins, so they are usually there on the first
  // render and appear at once; pins that arrive later grow into view.
  return (
    <CollapsePresence open={enabled && hasPinnedEvents}>
      <PinnedEventsBanner
        events={pinnedActiveEvents}
        guildId={guildId}
        onNavigate={onNavigate}
      />
    </CollapsePresence>
  );
};
