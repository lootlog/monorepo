import { PinnedEventsBanner } from "./pinned-events-banner";
import {
  getListPinnedEventsQueryKey,
  useListPinnedEvents,
} from "@lootlog/client/main";
import { AnimatePresence } from "framer-motion";
import * as m from "framer-motion/m";

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

  // The sidebar remounts per Organization, so the banner must grow in on mount too.
  return (
    <AnimatePresence>
      {!isPending && hasPinnedEvents && (
        <m.div
          key="pinned-events"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          className="overflow-hidden"
        >
          <PinnedEventsBanner
            events={pinnedActiveEvents}
            guildId={guildId}
            onNavigate={onNavigate}
          />
        </m.div>
      )}
    </AnimatePresence>
  );
};
