import { PinnedEventsBanner } from "./pinned-events-banner";
import {
  getListPinnedEventsQueryKey,
  useListPinnedEvents,
} from "@lootlog/client/main";
import { AnimatePresence, motion } from "framer-motion";

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
        refetchInterval: 60_000,
      },
    },
  );
  const pinnedActiveEvents = pinnedEvents?.map(({ event }) => event) ?? [];
  const hasPinnedEvents = pinnedActiveEvents.length > 0;

  return (
    <AnimatePresence initial={false}>
      {!isPending && hasPinnedEvents && (
        <motion.div
          key="pinned-events"
          layout
          initial={{ opacity: 0, scaleY: 0.96 }}
          animate={{ opacity: 1, scaleY: 1 }}
          exit={{ opacity: 0, scaleY: 0.96 }}
          style={{ transformOrigin: "top" }}
          transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          className="overflow-hidden"
        >
          <PinnedEventsBanner
            events={pinnedActiveEvents}
            guildId={guildId}
            onNavigate={onNavigate}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
