import { useEventsSettingsControllerGetSettings } from "@/lib/api/generated/main/event-settings/event-settings";
import { useUpdateEventSettings } from "./use-update-event-settings";

export const useToggleEventPin = (guildId: string) => {
  const { data: settings } = useEventsSettingsControllerGetSettings({
    guildId,
  });
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
