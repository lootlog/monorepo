import { PinnedEventsBanner } from "./pinned-events-banner";
import {
  getListPinnedEventsQueryKey,
  useListPinnedEvents,
} from "@lootlog/client/main";
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
  const { data: pinnedEvents, isPending } = useListPinnedEvents(
    { guildId },
    {
      query: {
        enabled: enabled && Boolean(guildId),
        queryKey: getListPinnedEventsQueryKey({ guildId }),
      },
    },
  );

  const pinnedActiveEvents = pinnedEvents?.map(({ event }) => event) ?? [];
  const hasPinnedEvents = pinnedActiveEvents.length > 0;

  // Mounting only once the list has loaded makes the first answer appear at
  // once; the banner grows only when a pin or the events access changes later.
  if (enabled && isPending) return null;

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
