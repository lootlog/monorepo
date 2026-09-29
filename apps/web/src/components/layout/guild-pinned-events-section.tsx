import { PinnedEventsBanner } from "./pinned-events-banner";
import {
  getListPinnedEventsQueryKey,
  useListPinnedEvents,
} from "@lootlog/client/main";
import { CollapsePresence } from "@/components/common/collapse-presence";

export const GuildPinnedEventsSection = ({
  guildId,
  onNavigate,
}: {
  guildId: string;
  onNavigate?: () => void;
}) => {
  const { data: pinnedEvents, isPending } = useListPinnedEvents(
    { guildId },
    {
      query: {
        enabled: Boolean(guildId),
        queryKey: getListPinnedEventsQueryKey({ guildId }),
      },
    },
  );

  const pinnedActiveEvents = pinnedEvents?.map(({ event }) => event) ?? [];
  const hasPinnedEvents = pinnedActiveEvents.length > 0;

  return (
    <CollapsePresence open={!isPending && hasPinnedEvents}>
      <PinnedEventsBanner
        events={pinnedActiveEvents}
        guildId={guildId}
        onNavigate={onNavigate}
      />
    </CollapsePresence>
  );
};
