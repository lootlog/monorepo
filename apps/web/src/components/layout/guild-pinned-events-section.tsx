import { startTransition, useEffect, useState } from "react";
import { isEventActiveAtTimestamp } from "@/features/guild/events/utils";
import { PinnedEventsBanner } from "./pinned-events-banner";
import {
  getListEventsQueryKey,
  useListEvents,
} from "@/lib/api/generated/main/events/events";
import { useEventsSettingsControllerGetSettings } from "@/lib/api/generated/main/event-settings/event-settings";
import { AnimatePresence, motion } from "framer-motion";

export const GuildPinnedEventsSection = ({
  guildId,
  onNavigate,
}: {
  guildId: string;
  onNavigate?: () => void;
}) => {
  const { data: activeEvents, isPending: isEventsPending } = useListEvents(
    {
      guildId,
    },
    {
      activeOnly: "true",
    },
    {
      query: {
        queryKey: getListEventsQueryKey(
          {
            guildId,
          },
          {
            activeOnly: "true",
          },
        ),
        refetchInterval: 60_000,
      },
    },
  );
  const { data: eventSettings, isPending: isSettingsPending } =
    useEventsSettingsControllerGetSettings({ guildId });
  const [currentTimestamp, setCurrentTimestamp] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      startTransition(() => {
        setCurrentTimestamp(Date.now());
      });
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

  const filteredActiveEvents = (activeEvents ?? []).filter((event) =>
    isEventActiveAtTimestamp(event, currentTimestamp),
  );
  const pinnedActiveEvents = (eventSettings?.pinnedEvents ?? [])
    .map((eventId) =>
      filteredActiveEvents.find((event) => event.id === eventId),
    )
    .filter((event) => event !== undefined);

  const isLoading = isEventsPending || isSettingsPending;
  const hasPinnedEvents = pinnedActiveEvents.length > 0;

  return (
    <AnimatePresence initial={false}>
      {!isLoading && hasPinnedEvents && (
        <motion.div
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
        </motion.div>
      )}
    </AnimatePresence>
  );
};
