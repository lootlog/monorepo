import { startTransition, useEffect, useState } from "react";
import { useEvents, useEventSettings } from "@/features/events/hooks";
import { isEventActiveAtTimestamp } from "@/features/events/utils";
import { PinnedEventsBanner } from "./pinned-events-banner";

export const GuildPinnedEventsSection = ({
  guildId,
  onNavigate,
}: {
  guildId: string;
  onNavigate?: () => void;
}) => {
  const { data: activeEvents, isPending: isEventsPending } = useEvents({
    guildId,
    activeOnly: true,
    enabled: Boolean(guildId),
  });
  const { data: eventSettings, isPending: isSettingsPending } =
    useEventSettings(guildId);
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

  if (isEventsPending || isSettingsPending) {
    return (
      <div className="px-2 mb-3 pb-3 border-b border-border">
        <div className="h-24 rounded-lg border border-yellow-500/20 bg-yellow-500/5" />
      </div>
    );
  }

  if (pinnedActiveEvents.length === 0) {
    return null;
  }

  return (
    <PinnedEventsBanner
      events={pinnedActiveEvents}
      guildId={guildId}
      onNavigate={onNavigate}
    />
  );
};
