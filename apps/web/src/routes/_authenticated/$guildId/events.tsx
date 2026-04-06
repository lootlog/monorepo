import { createFileRoute } from "@tanstack/react-router";
import { Events } from "@/features/events/events";

export const Route = createFileRoute("/_authenticated/$guildId/events")({
  component: Events,
});
