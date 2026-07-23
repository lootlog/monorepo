import { startTransition, useEffect, useState } from "react";
import { isEventActiveAtTimestamp } from "@/features/guild/events/utils/event-activity";
import { PinnedEventsBanner } from "./pinned-events-banner";
import {
  getEventsSettingsControllerGetSettingsQueryKey,
  useEventsSettingsControllerGetSettings,
} from "@lootlog/api-client/react-query/main/event-settings";
import { AnimatePresence, motion } from "framer-motion";
import type { ListEventsQueryResult } from "@lootlog/api-client/react-query/main/events";

export const GuildPinnedEventsSection = ({
  activeEvents,
  guildId,
  onNavigate,
}: {
  activeEvents: ListEventsQueryResult;
  guildId: string;
  onNavigate?: () => void;
}) => {
  const { data: eventSettings, isPending: isSettingsPending } =
    useEventsSettingsControllerGetSettings(
      { guildId },
      {
        query: {
          enabled: Boolean(guildId),
          queryKey: getEventsSettingsControllerGetSettingsQueryKey({
            guildId,
          }),
        },
      },
    );
  const [currentTimestamp, setCurrentTimestamp] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      startTransition(() => {
        setCurrentTimestamp(Date.now());
      });
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

  const filteredActiveEvents = activeEvents.filter((event) =>
    isEventActiveAtTimestamp(event, currentTimestamp),
  );
  const pinnedActiveEvents = (eventSettings?.pinnedEvents ?? [])
    .map((eventId) =>
      filteredActiveEvents.find((event) => event.id === eventId),
    )
    .filter((event) => event !== undefined);

  const isLoading = isSettingsPending;
  const hasPinnedEvents = pinnedActiveEvents.length > 0;

  return (
    <AnimatePresence initial={false}>
      {!isLoading && hasPinnedEvents && (
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
