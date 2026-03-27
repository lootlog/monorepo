import { useEventSettings } from "../queries/use-event-settings";
import { useUpdateEventSettings } from "./use-update-event-settings";

export const useToggleEventPin = (guildId: string) => {
  const { data: settings } = useEventSettings(guildId);
  const updateSettings = useUpdateEventSettings(guildId);

  const togglePin = (eventId: string) => {
    const current = settings?.pinnedEvents ?? [];
    const isPinned = current.includes(eventId);
    const next = isPinned
      ? current.filter((id) => id !== eventId)
      : [eventId, ...current];
    updateSettings.mutate({ pinnedEvents: next });
  };

  const isPinned = (eventId: string) =>
    (settings?.pinnedEvents ?? []).includes(eventId);

  return { togglePin, isPinned, isLoading: updateSettings.isPending };
};
