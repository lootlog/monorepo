import { createFileRoute } from "@tanstack/react-router";
import { EventEditSettingsPage } from "@/features/events/event-edit-settings-page";

export const Route = createFileRoute(
  "/_authenticated/$guildId/events_/$eventId_/edit/settings",
)({
  component: EventEditSettingsPage,
});
