import { createLazyFileRoute } from "@tanstack/react-router";
import { EventEditSettingsPage } from "@/features/events/event-edit-settings-page";

export const Route = createLazyFileRoute(
  "/_authenticated/$guildId/events_/$eventId_/edit/settings",
)({
  component: EventEditSettingsPage,
});
