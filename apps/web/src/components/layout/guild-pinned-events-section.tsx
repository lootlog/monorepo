import { startTransition, useEffect, useState } from "react";
import { isEventActiveAtTimestamp } from "@/features/guild/events/utils";
import { PinnedEventsBanner } from "./pinned-events-banner";
import { useListEvents } from "@/lib/api/generated/main/events/events";
import { useEventsSettingsControllerGetSettings } from "@/lib/api/generated/main/event-settings/event-settings";

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
