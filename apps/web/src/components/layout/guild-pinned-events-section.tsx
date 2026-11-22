import { PinnedEventsBanner } from "./pinned-events-banner";
import { useListPinnedEvents } from "@lootlog/client/main";
import { CollapsePresence } from "@/components/common/collapse-presence";

export const GuildPinnedEventsSection = ({
  guildId,
  enabled,
  onNavigate,
}: {
  guildId: string;
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
