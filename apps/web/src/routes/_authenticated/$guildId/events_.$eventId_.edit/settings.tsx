import { createFileRoute } from "@tanstack/react-router";
import { EventEditSettingsPage } from "@/features/guild/events/event-edit-settings-page";
import { EventEditSkeleton } from "@/features/guild/events/event-edit-skeleton";

export const Route = createFileRoute(
  "/_authenticated/$guildId/events_/$eventId_/edit/settings",
)({
  component: EventEditSettingsPage,
  pendingComponent: EventEditSkeleton,
});
