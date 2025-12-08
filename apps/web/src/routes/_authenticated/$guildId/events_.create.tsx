import { createFileRoute } from "@tanstack/react-router";
import { EventCreate } from "@/features/events/event-create";

export const Route = createFileRoute("/_authenticated/$guildId/events_/create")({
  component: EventCreate,
});
